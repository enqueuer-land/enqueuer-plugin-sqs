import {Logger, MainInstance, Subscription, SubscriptionModel, SubscriptionProtocol} from 'enqueuer-plugins-template';
import * as AWS from 'aws-sdk';
import {ReceiveMessageResult} from 'aws-sdk/clients/sqs';

export class SqsSubscription extends Subscription {

    private sqs: AWS.SQS;

    constructor(subscriptionModel: SubscriptionModel) {
        super(subscriptionModel);

        this.sqs = new AWS.SQS(subscriptionModel.awsConfiguration);
    }

    public receiveMessage(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.sqs.receiveMessage(this.messageParams, (err: AWS.AWSError, data: ReceiveMessageResult) => {
                Logger.trace(`SQS got data: ${JSON.stringify(data)}`);
                if (err) {
                    Logger.error('Error receiving message from SQS');
                    return reject(err);
                } else if (data.Messages && data.Messages.length > 0) {
                    Logger.debug('SQS got a message: ' + JSON.stringify(data.Messages[0]));
                    return resolve(data.Messages[0]);
                }
            });
        });
    }

    public subscribe(): Promise<void> {
        return Promise.resolve();
    }

}
export function entryPoint(mainInstance: MainInstance): void {
    const sqs = new SubscriptionProtocol('sqs',
        (subscriptionModel: SubscriptionModel) => new SqsSubscription(subscriptionModel),
        ['Body', 'MessageId', 'ReceiptHandle', 'MD5OfBody'])
        .setLibrary('aws-sdk');
    mainInstance.protocolManager.addProtocol(sqs);
}
