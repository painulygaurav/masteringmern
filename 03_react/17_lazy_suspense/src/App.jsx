import { lazy, Suspense } from "react";
import Spinner from "./Spinner";
import Shimmer from "./Shimmer";

// If I am rendering all the component at once that is going to create rendering delay
// I want to rendering only what is required
// For example I want to delay the Billing component and want to add some delay
// so for example the moment I click on Pay Bill button I wan the billing component immediately
// But what if it has some api call or some expensive computation that is time taking there will be unecessary delay
// In that case we need to suspend that component and till that particular suspension I am going to show a spinner
// I am going to make an excuse that while I am getting the Billing component I am going to show spinner
// Its like telling using "just doing it just a minute"
// lazy and suspension work hand in hand
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const Home = lazy(() => delay(1000).then(() => import("./Home")));
const Billing = lazy(() => delay(3000).then(() => import("./Billing")));
const App = () => {
  return (
    <div>
      <Suspense fallback={<Spinner />}>
        <Home />
      </Suspense>
      <Suspense fallback={<Shimmer />}>
        <Billing />
      </Suspense>
    </div>
  );
};

export default App;

/**
 * A bit about micro front end architecture, how things work behind the scenes
 * LCP (Largest Contentful Paint)
 * CLS (Commulative Layout Shift)
 * INP (Interaction to Next Paint)
 * Take Amazon example of loading 100 pages of product using resource hinting.
 * Windowing/Pagination (offset)
 * What Happens if somebody directly clicks on 100th page of the product.
 * How products are rendered within each categories.
 *
 */
