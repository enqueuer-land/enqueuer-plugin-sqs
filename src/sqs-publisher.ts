import {Logger, MainInstance, Publisher, InputPublisherModel, PublisherProtocol} from 'enqueuer';
import * as AWS from 'aws-sdk';
import {SendMessageRequest, SendMessageResult} from 'aws-sdk/clients/sqs';

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
        {onPublished: ['ResponseMetadata', 'MD5OfMessageBody', 'MD5OfMessageAttributes', 'MessageId']})
        .setLibrary('aws-sdk');
    mainInstance.protocolManager.addProtocol(sqs);
}
