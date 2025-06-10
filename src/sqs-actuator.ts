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
  private params: SendMessageCommandInput;

  public constructor(properties: InputActuatorModel) {
    super(properties);

    this.params = properties.messageParams || {};
    this.params.MessageBody =
      typeof properties.payload === "string"
        ? properties.payload
        : JSON.stringify(properties.payload);
  }

  public async act(): Promise<void> {
    try {
      const sqsSend = new SQS(this.awsConfiguration);
      if (this.purgeBeforeSend) {
        Logger.trace(
          `Purging SQS queue: ${this.awsConfiguration.endpoint}/${this.awsConfiguration.queueUrl}`
        );
        await sqsSend.purgeQueue({
          QueueUrl: this.messageParams.QueueUrl,
        });
        Logger.trace("SQS queue purged successfully.");
      }

      const data: SendMessageCommandOutput = await sqsSend.sendMessage(
        this.messageParams
      );
      Logger.trace(`SQS send message result: ${JSON.stringify(data)}`);
      this.executeHookEvent("onPublished", data);
    } catch (err: unknown) {
      let errMessage = err;
      if (err instanceof Error && "errors" in err) {
        errMessage = err.errors;
      }
      Logger.error(`Error publishing to SQS: '${errMessage}'`);
      throw err;
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
          purgeBeforeSend: {
            type: "boolean",
            description:
              "If true, the SQS queue will be purged before the message is sent.",
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
