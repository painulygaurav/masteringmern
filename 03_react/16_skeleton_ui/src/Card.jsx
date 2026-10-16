const Card = () => {
  return (
    <div className="max-w-sm mx-auto mt-10 rounded-lg shadow-md overflow-hidden bg-white">
      <img
        className="w-full h-48 object-cover"
        src="https://picsum.photos/400/200"
        alt="Card"
      />
      <div className="p-4">
        <h2 className="text-xl font-bold mb-2">Card Title</h2>
        <p className="text-gray-600">
          This is a simple card component. The content has finished loading.
        </p>
      </div>
    </div>
  );
};

export default Card;
