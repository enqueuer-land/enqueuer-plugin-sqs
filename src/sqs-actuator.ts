import {
  SendMessageCommandInput,
  SendMessageCommandOutput,
  SQS,
} from "@aws-sdk/client-sqs";
import {
  Actuator,
  ActuatorProtocol,
  InputActuatorModel,
  Logger,
  MainInstance,
} from "enqueuer";

export class SqsActuator extends Actuator {
  private sqsSend: SQS;
  private params: SendMessageCommandInput;

  public constructor(properties: InputActuatorModel) {
    super(properties);

    this.sqsSend = new SQS(properties.awsConfiguration);
    this.params = properties.messageParams || {};
    this.params.MessageBody = properties.payload;
  }

  public async act(): Promise<void> {
    try {
      const data: SendMessageCommandOutput = await this.sqsSend.sendMessage(
        this.messageParams
      );
      Logger.trace(`SQS send message result: ${JSON.stringify(data)}`);
      this.executeHookEvent("onPublished", data);
    } catch (err) {
      Logger.error(`Error publishing to SQS: ${err}`);
      this.executeHookEvent("onError", err);
    }
  }
}

export function entryPoint(mainInstance: MainInstance): void {
  const sqs = new ActuatorProtocol(
    "sqs",
    (properties: InputActuatorModel) => new SqsActuator(properties),
    {
      homepage: "https://github.com/enqueuer-land/enqueuer-plugin-sqs",
      description: "Actuator to handle AWS sqs messages",
      libraryHomepage: "https://www.npmjs.com/package/aws-sdk",
      schema: {
        attributes: {
          payload: {
            type: "any",
          },
          awsConfiguration: {
            type: {
              endpoint: {
                type: "string",
              },
              accessKeyId: {
                type: "string",
              },
              secretAccessKey: {
                type: "string",
              },
              region: {
                type: "string",
              },
            },
          },
        },
        hooks: {
          onPublished: {
            description: "Executed when message was published correctly.",
            arguments: {
              ResponseMetadata: {
                description:
                  "Contains the RequestId which, in turn, contains the UUID of the request.",
              },
              MD5OfMessageBody: {
                description:
                  "An MD5 digest of the non-URL-encoded message body string.",
              },
              MD5OfMessageAttributes: {
                description:
                  "An MD5 digest of the non-URL-encoded message attribute string. " +
                  "You can use this attribute to verify that Amazon SQS received the message correctly.",
              },
              MessageId: {
                description:
                  "A unique identifier for the message. A MessageIdis considered unique " +
                  "across all AWS accounts for an extended period of time.",
              },
            },
          },
        },
      },
    }
  ).setLibrary("aws-sdk/client-sqs");
  mainInstance.protocolManager.addProtocol(sqs);
}
