import generalPineapple from "@/assets/PULPINAGENERALPINA.svg";
import menPineapple from "@/assets/PULPINAMENPINA.svg";
import moonPineapple from "@/assets/PULPINAMOONPINA.svg";
import sunshinePineapple from "@/assets/PULPINASUNSHINEPINA.svg";
import { ThemeImage } from "@/components/theme/ThemeImage";

export type StorePineappleTheme = "store" | "moon" | "sunshine" | "men";

const PINEAPPLE_BY_THEME: Record<StorePineappleTheme, string> = {
  store: generalPineapple,
  moon: moonPineapple,
  sunshine: sunshinePineapple,
  men: menPineapple,
};

export function StorePineapple({
  theme,
  className = "",
}: {
  theme: StorePineappleTheme;
  className?: string;
}) {
  return (
    <ThemeImage
      slot={theme === "store" ? "pineapple.general" : `pineapple.${theme}`}
      src={PINEAPPLE_BY_THEME[theme]}
      alt=""
      aria-hidden="true"
      className={className}
    />
  );
}
