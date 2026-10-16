const Spinner = () => {
  return (
    <div className="flex items-center justify-center gap-3 p-6 text-gray-600">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      <span>Please wait...</span>
    </div>
  );
};

export default Spinner;
