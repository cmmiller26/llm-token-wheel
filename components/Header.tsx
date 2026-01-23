export default function Header() {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center gap-3 mb-2">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          LLM Token Wheel
        </h1>
      </div>
      <p className="text-zinc-600 dark:text-zinc-400">
        Explore how AI generates text, one token at a time
      </p>
    </div>
  );
}
