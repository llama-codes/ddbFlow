import { TableList } from "../sidebar/TableList";
import { MainContent } from "../table-view/MainContent";

export function DynamoDBExplorer() {
  return (
    <>
      <TableList />
      <MainContent />
    </>
  );
}
