import { useEffect, useState } from "react";
import Home from "./Home";

// Stand-in for a real API call. Replace with fetch("/api/posts", { signal }).
function fetchPosts({ signal } = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve([
        {
          id: 1,
          image: `https://picsum.photos/seed/card-1/640/360`,
          category: "Engineering",
          title: "Sample post title number 1 that may wrap onto two lines",
          description:
            "A short summary of the post. It is clamped to three lines in the card, so longer text will be truncated with an ellipsis instead of stretching the layout.",
          author: "Gaurav",
          readTime: 3,
        },
      ]);
    }, 1800);

    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

export default function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetchPosts({ signal: controller.signal })
      .then((data) => {
        setPosts(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError("Couldn't load posts. Check your connection and try again.");
        setLoading(false);
      });

    return () => controller.abort();
  }, [attempt]);

  return (
    <Home
      posts={posts}
      loading={loading}
      error={error}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  );
}
