import { Logger, MainInstance, Publisher, InputPublisherModel, PublisherProtocol } from 'enqueuer';
import * as AWS from 'aws-sdk';
import { SendMessageRequest, SendMessageResult } from 'aws-sdk/clients/sqs';

export class SqsPublisher extends Publisher {

    private sqsSend: AWS.SQS;
    private params: SendMessageRequest;

    public constructor(publisherProperties: InputPublisherModel) {
        super(publisherProperties);

        this.sqsSend = new AWS.SQS(publisherProperties.awsConfiguration);
        this.params = publisherProperties.messageParams || {};
        this.params.MessageBody = publisherProperties.payload;
    }

    public publish(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.sqsSend.sendMessage(this.messageParams, (err: AWS.AWSError, data: SendMessageResult) => {
                if (err) {
                    return reject(`Error publishing to SQS: ${err}`);
                } else {
                    Logger.trace(`SQS send message result: ${JSON.stringify(data)}`);
                    this.executeHookEvent('onPublished', data);
                    return resolve();
                }
            });
        });
    }

}

export function entryPoint(mainInstance: MainInstance): void {
    const sqs = new PublisherProtocol('sqs',
        (publisherModel: InputPublisherModel) => new SqsPublisher(publisherModel),
        {
            homepage: 'https://github.com/enqueuer-land/enqueuer-plugin-sqs',
            description: 'Publisher to handle AWS sqs messages',
            libraryHomepage: 'https://www.npmjs.com/package/aws-sdk',
            schema: {
                attributes: {
                    payload: {
                        type: 'any'
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
                    onPublished: {
                        description: 'Executed when message was published correctly.',
                        arguments: {
                            ResponseMetadata: {
                                description: 'Contains the RequestId which, in turn, contains the UUID of the request.'
                            },
                            MD5OfMessageBody: {
                                description: 'An MD5 digest of the non-URL-encoded message body string.'
                            },
                            MD5OfMessageAttributes: {
                                description: 'An MD5 digest of the non-URL-encoded message attribute string. ' +
                                'You can use this attribute to verify that Amazon SQS received the message correctly.'
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
