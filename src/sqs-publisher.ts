import {Logger, MainInstance, Publisher, PublisherModel, PublisherProtocol} from 'enqueuer-plugins-template';
import * as AWS from 'aws-sdk';
import {SendMessageRequest, SendMessageResult} from 'aws-sdk/clients/sqs';

export class SqsPublisher extends Publisher {

    private sqsSend: AWS.SQS;
    private params: SendMessageRequest;

    public constructor(publisherProperties: PublisherModel) {
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
                    this.messageReceived = data;
                    Logger.trace(`SQS send message result: ${JSON.stringify(data)}`);
                    return resolve();
                }
            });
        });
    }

}

export function entryPoint(mainInstance: MainInstance): void {
    const sqs = new PublisherProtocol('sqs',
        (publisherModel: PublisherModel) => new SqsPublisher(publisherModel),
        ['ResponseMetadata', 'MD5OfMessageBody', 'MD5OfMessageAttributes', 'MessageId'])
        .setLibrary('aws-sdk');
    mainInstance.protocolManager.addProtocol(sqs);
}
