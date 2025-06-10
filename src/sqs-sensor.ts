import {
  ReceiveMessageCommandOutput,
  DeleteMessageCommand,
  SQS,
} from "@aws-sdk/client-sqs";
import {
  InputSensorModel,
  Logger,
  MainInstance,
  Sensor,
  SensorProtocol,
} from "enqueuer";

export class SqsSensor extends Sensor {
  private sqs?: SQS;

  constructor(properties: InputSensorModel) {
    properties.timeout =
      properties.messageParams?.WaitTimeSeconds * 1000 || properties.timeout;
    super(properties);
  }

  public async receiveMessage(): Promise<void> {
    try {
      const output: ReceiveMessageCommandOutput =
        await this.sqs!.receiveMessage(this.messageParams);
      const message = output.Messages![0];
      this.executeHookEvent("onMessageReceived", message);

      if (this.deleteMessageAfterReceive) {
        Logger.trace(
          `Deleting message from SQS queue: ${this.awsConfiguration.endpoint}/${this.messageParams.QueueUrl}`
        );
        const deletionResponse = this.sqs!.deleteMessage({
          QueueUrl: this.messageParams.QueueUrl,
          ReceiptHandle: message.ReceiptHandle,
        });
        this.executeHookEvent("onMessageDeleted", deletionResponse);
        Logger.trace(
          `Message deleted successfully from SQS queue: ${this.awsConfiguration.endpoint}/${this.messageParams.QueueUrl}`
        );
      }
      if (this.purgeQueueAfterReceive) {
        Logger.trace(
          `Purging SQS queue: ${this.awsConfiguration.endpoint}/${this.messageParams.QueueUrl}`
        );
        await this.sqs!.purgeQueue({ QueueUrl: this.messageParams.QueueUrl });
        this.executeHookEvent("onQueuePurged");
        Logger.trace("SQS queue purged successfully.");
      }
    } catch (err) {
      let errMessage = err;
      if (err instanceof Error && "errors" in err) {
        errMessage = err.errors;
      }

      Logger.error(`Error executing SQS command: '${errMessage}'`);
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
          deleteMessageAfterReceive: {
            type: "boolean",
            description:
              "If true, the message will be deleted after being read from the queue.",
          },
          purgeQueueAfterReceive: {
            type: "boolean",
            description:
              "If true, the SQS queue will be purged after the message is received.",
          },
        },
        hooks: {
          onSubscribed: {
            arguments: {},
            description: "Executed when subscription was subscribed.",
          },
          onMessageDeleted: {
            arguments: {},
            description:
              "Executed when and if a message is deleted after reading it.",
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
