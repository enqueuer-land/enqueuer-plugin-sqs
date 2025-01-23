import * as sensor from "./sqs-sensor";
import * as actuator from "./sqs-actuator";
import { MainInstance } from "enqueuer";

export function entryPoint(mainInstance: MainInstance): void {
  sensor.entryPoint(mainInstance);
  actuator.entryPoint(mainInstance);
}
