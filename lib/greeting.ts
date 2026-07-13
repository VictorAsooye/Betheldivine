import { Sunrise, Sun, Moon, type LucideIcon } from "lucide-react";

const COPY = {
  morning:   { greet: "Good morning", sub: ["Here's where things stand today.", "Let's see what's on deck.", "Ready when you are."], icon: Sunrise },
  afternoon: { greet: "Good afternoon", sub: ["Everything's tracking as expected.", "Here's where things stand.", "All quiet for now."], icon: Sun },
  evening:   { greet: "Good evening", sub: ["Wrapping up for the day.", "Here's a quick look before you go.", "Things are steady tonight."], icon: Moon },
  night:     { greet: "Good evening", sub: ["Everything's quiet right now.", "Nothing urgent tonight."], icon: Moon },
} as const;

function timeBucket(hour: number): keyof typeof COPY {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export interface Greeting {
  icon: LucideIcon;
  line: string;
  sub: string;
}

export function getGreeting(name: string): Greeting {
  const bucket = timeBucket(new Date().getHours());
  const copy = COPY[bucket];
  const sub = copy.sub[Math.floor(Math.random() * copy.sub.length)];
  return { icon: copy.icon, line: `${copy.greet}, ${name}.`, sub };
}
