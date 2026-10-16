const Skeleton = () => {
  return (
    <div className="max-w-sm mx-auto mt-10 rounded-lg shadow-md overflow-hidden bg-white animate-pulse">
      <div className="w-full h-48 bg-gray-300" />
      <div className="p-4">
        <div className="h-6 w-1/2 bg-gray-300 rounded mb-3" />
        <div className="h-4 w-full bg-gray-300 rounded mb-2" />
        <div className="h-4 w-3/4 bg-gray-300 rounded" />
      </div>
    </div>
  );
};

export default Skeleton;
