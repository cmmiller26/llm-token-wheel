import ThemeToggle from './ThemeToggle';
import GitHubLink from './GitHubLink';

export default function Footer() {
  return (
    <footer className="mt-6 mb-6 flex items-center justify-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
      <ThemeToggle />
      <span className="text-zinc-300 dark:text-zinc-600">|</span>
      <span>Powered by Gemini 2.0 Flash-Lite</span>
      <span className="text-zinc-300 dark:text-zinc-600">|</span>
      <GitHubLink />
    </footer>
  );
}
