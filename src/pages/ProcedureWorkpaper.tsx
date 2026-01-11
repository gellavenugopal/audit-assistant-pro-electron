import { useParams } from "react-router-dom";

const ProcedureWorkpaper = () => {
  const { procedureId } = useParams();

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Workpaper</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This view is not implemented yet.
      </p>
      {procedureId && (
        <p className="mt-4 text-sm">
          Procedure ID: <span className="font-mono">{procedureId}</span>
        </p>
      )}
    </div>
  );
};

export default ProcedureWorkpaper;
