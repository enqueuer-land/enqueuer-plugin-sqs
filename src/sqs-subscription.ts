import { Logger, MainInstance, Subscription, InputSubscriptionModel, SubscriptionProtocol } from 'enqueuer';
import * as AWS from 'aws-sdk';
import { ReceiveMessageResult } from 'aws-sdk/clients/sqs';

export class SqsSubscription extends Subscription {

    private sqs: AWS.SQS;

    constructor(subscriptionModel: InputSubscriptionModel) {
        super(subscriptionModel);

        this.sqs = new AWS.SQS(subscriptionModel.awsConfiguration);
    }

    public receiveMessage(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.sqs.receiveMessage(this.messageParams, (err: AWS.AWSError, data: ReceiveMessageResult) => {
                Logger.trace(`SQS got data: ${JSON.stringify(data)}`);
                if (err) {
                    Logger.error('Error receiving message from SQS');
                    return reject(err);
                } else if (data.Messages && data.Messages.length > 0) {
                    Logger.debug('SQS got a message: ' + JSON.stringify(data.Messages[0]));
                    this.executeHookEvent('onMessageReceived', data.Messages[0]);
                    return resolve();
                }
            });
        });
    }

    public async subscribe(): Promise<void> {
        this.executeHookEvent('onSubscribed');
    }
}

export function entryPoint(mainInstance: MainInstance): void {
    const sqs = new SubscriptionProtocol('sqs',
        (subscriptionModel: InputSubscriptionModel) => new SqsSubscription(subscriptionModel),
        {
            homepage: 'https://github.com/enqueuer-land/enqueuer-plugin-sqs',
            description: 'Subscription to handle AWS sqs messages',
            libraryHomepage: 'https://www.npmjs.com/package/aws-sdk',
            schema: {
                attributes: {
                    messageParams: {
                        type: 'object'
                    },
                    awsConfiguration: {
                        type: {
                            endpoint: {
                                type: 'string'
                            },
                            accessKeyId: {
                                type: 'string'
                            },
                            secretAccessKey: {
                                type: 'string'
                            },
                            region: {
                                type: 'string'
                            }
                        }
                    },
                },
                hooks: {
                    onSubscribed: {
                        arguments: {},
                        description: 'Executed when subscription was subscribed.',
                    },
                    onMessageReceived: {
                        description: 'Executed when message was published correctly.',
                        arguments: {
                            Body: {
                                description: 'The message\'s contents (not URL-encoded).'
                            },
                            MD5OfBody: {
                                description: 'An MD5 digest of the non-URL-encoded message body string.'
                            },
                            ReceiptHandle: {
                                description: 'An identifier associated with the act of receiving the message.' +
                                    'A new receipt handle is returned every time you receive a message. When deleting ' +
                                    'a message, you provide the last received receipt handle to delete the message.'
                            },
                            MessageId: {
                                description: 'A unique identifier for the message. A MessageIdis considered unique ' +
                                    'across all AWS accounts for an extended period of time.'
                            }
                        }
                    }
                }
            }
        })
        .setLibrary('aws-sdk');
    mainInstance.protocolManager.addProtocol(sqs);
}
