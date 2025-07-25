// src/_components/Spinner.jsx
export default function Spinner() {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-white bg-opacity-70">
      <div className="spinner-apple-sticks">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i}></div>
        ))}
      </div>
    </div>
  );
}
