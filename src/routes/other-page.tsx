import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/other-page")({
  component: OtherPage,
});

function OtherPage() {
  return (
    <main>
      <h1>Other page</h1>
      <p>
        Navigate back to the Tamagui counter route; the counter page unmounts while you are here.
      </p>
      <p>
        <Link to="/tamagui-counter">Back to counter</Link>
      </p>
    </main>
  );
}
