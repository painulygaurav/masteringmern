const Shimmer = () => {
  return (
    <div className="mx-auto my-6 w-80 animate-pulse rounded-xl border border-gray-200 bg-white p-6 shadow">
      <div className="mb-4 h-6 w-1/2 rounded bg-gray-200" />
      <div className="mb-2 h-4 w-full rounded bg-gray-200" />
      <div className="mb-6 h-4 w-3/4 rounded bg-gray-200" />
      <div className="h-10 w-full rounded bg-gray-200" />
    </div>
  );
};
export default Shimmer;
