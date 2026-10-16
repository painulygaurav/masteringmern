const WithLoalding = (Component) => {
  return function EnhancedComponent({ isLoading, ...props }) {
    if (isLoading) {
      return <h2>Please wait we are loading...</h2>;
    }
    return <Component {...props} />;
  };
};

export default WithLoalding;
