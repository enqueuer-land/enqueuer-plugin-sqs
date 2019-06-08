import * as subscription from './sqs-subscription';
import * as publisher from './sqs-publisher';
import {MainInstance} from 'enqueuer';

export function entryPoint(mainInstance: MainInstance): void {
    subscription.entryPoint(mainInstance);
    publisher.entryPoint(mainInstance);
}
