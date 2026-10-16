const Billing = () => {
  return (
    <div className="mx-auto my-6 w-80 rounded-xl border border-gray-200 bg-white p-6 shadow">
      <h2 className="mb-2 text-xl font-semibold text-gray-800">Billing</h2>
      <p className="mb-1 text-gray-600">Amount due: $120.00</p>
      <p className="mb-6 text-gray-600">Due date: 30 Nov</p>
      <button className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700">
        Pay Bill
      </button>
    </div>
  );
};

export default Billing;
