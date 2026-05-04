import { Effect } from "effect";
import { FilterLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { CloudWatchLogsClient } from "./AwsServiceClients";
import { DynamoError, ValidationError } from "shared/errors";
import type {
  InvocationGroup,
  LogEvent,
  LogFetchParams,
  LogFetchResult,
} from "shared/schemas";

const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
const REQUEST_ID_RE = /RequestId:\s*([0-9a-f-]{36})/i;

function extractRequestId(message: string): string | undefined {
  return REQUEST_ID_RE.exec(message)?.[1] ?? UUID_RE.exec(message)?.[0];
}

function groupEvents(events: LogEvent[]): InvocationGroup[] {
  const byGroup = new Map<string, LogEvent[]>();
  const currentByStream = new Map<string, string>();

  for (const event of events) {
    const explicitRequestId = event.requestId;
    if (explicitRequestId) currentByStream.set(event.logStreamName, explicitRequestId);
    const groupId =
      explicitRequestId ??
      currentByStream.get(event.logStreamName) ??
      event.logStreamName;
    const existing = byGroup.get(groupId) ?? [];
    existing.push(event);
    byGroup.set(groupId, existing);
  }

  return [...byGroup.entries()]
    .map(([id, groupEvents]) => {
      const first = groupEvents[0]!;
      const last = groupEvents[groupEvents.length - 1]!;
      return {
        id,
        requestId: UUID_RE.test(id) ? id : undefined,
        logStreamName: first.logStreamName,
        startTime: first.timestamp,
        endTime: last.timestamp,
        eventCount: groupEvents.length,
      };
    })
    .sort((a, b) => b.startTime - a.startTime);
}

export const fetchLogEvents = (params: LogFetchParams) =>
  Effect.gen(function* () {
    if (!params.functionName) {
      yield* Effect.fail(new ValidationError({ message: "functionName is required" }));
    }
    if (!params.startTime || !params.endTime || params.startTime >= params.endTime) {
      yield* Effect.fail(new ValidationError({ message: "valid startTime and endTime are required" }));
    }

    const client = yield* CloudWatchLogsClient;
    const logGroupName = `/aws/lambda/${params.functionName}`;
    const result = yield* Effect.tryPromise({
      try: () =>
        client.send(
          new FilterLogEventsCommand({
            logGroupName,
            startTime: params.startTime,
            endTime: params.endTime,
            limit: params.limit ?? 500,
            nextToken: params.nextToken,
            interleaved: true,
          }),
        ),
      catch: (cause) => new DynamoError({ cause }),
    });

    const events: LogEvent[] = (result.events ?? []).map((event, index) => {
      const message = event.message ?? "";
      return {
        id:
          event.eventId ??
          `${event.logStreamName ?? "stream"}:${event.timestamp ?? 0}:${index}`,
        timestamp: event.timestamp ?? 0,
        ingestionTime: event.ingestionTime,
        message,
        logStreamName: event.logStreamName ?? "",
        requestId: extractRequestId(message),
      };
    });

    const response: LogFetchResult = {
      events,
      groups: groupEvents(events),
      nextToken: result.nextToken,
    };

    return response;
  });
