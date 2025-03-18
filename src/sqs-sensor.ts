import { ReceiveMessageCommandOutput, SQS } from "@aws-sdk/client-sqs";
import {
  InputSensorModel,
  Logger,
  MainInstance,
  Sensor,
  SensorProtocol,
} from "enqueuer";

export class SqsSensor extends Sensor {
  constructor(properties: InputSensorModel) {
    properties.timeout =
      properties.messageParams?.WaitTimeSeconds * 1000 || properties.timeout;
    super(properties);
  }

  public async receiveMessage(): Promise<void> {
    try {
      const output: ReceiveMessageCommandOutput = await this.sqs.receiveMessage(
        this.messageParams
      );
      this.executeHookEvent("onMessageReceived", output.Messages![0]);
    } catch (err) {
      let errMessage = err;
      if (err instanceof Error && "errors" in err) {
        errMessage = err.errors;
      }

      Logger.error(`Error receiving message from SQS: '${errMessage}'`);
      throw err;
    }
  }

  public async mount(): Promise<void> {
    this.sqs = new SQS(this.awsConfiguration);
    this.executeHookEvent("onSubscribed");
  }
}

export function entryPoint(mainInstance: MainInstance): void {
  const sqs = new SensorProtocol(
    "sqs",
    (properties: InputSensorModel) => new SqsSensor(properties),
    {
      homepage: "https://github.com/enqueuer-land/enqueuer-plugin-sqs",
      description: "Sensor to handle AWS sqs messages",
      libraryHomepage: "https://www.npmjs.com/package/aws-sdk",
      schema: {
        attributes: {
          messageParams: {
            type: "object",
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
          onSubscribed: {
            arguments: {},
            description: "Executed when subscription was subscribed.",
          },
          onMessageReceived: {
            description: "Executed when message was published correctly.",
            arguments: {
              Body: {
                description: "The message's contents (not URL-encoded).",
              },
              MD5OfBody: {
                description:
                  "An MD5 digest of the non-URL-encoded message body string.",
              },
              ReceiptHandle: {
                description:
                  "An identifier associated with the act of receiving the message." +
                  "A new receipt handle is returned every time you receive a message. When deleting " +
                  "a message, you provide the last received receipt handle to delete the message.",
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
