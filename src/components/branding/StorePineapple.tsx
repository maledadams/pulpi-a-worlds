import generalPineapple from "@/assets/PULPINAGENERALPINA.svg";
import menPineapple from "@/assets/PULPINAMENPINA.svg";
import moonPineapple from "@/assets/PULPINAMOONPINA.svg";
import sunshinePineapple from "@/assets/PULPINASUNSHINEPINA.svg";

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
    <img
      src={PINEAPPLE_BY_THEME[theme]}
      alt=""
      aria-hidden="true"
      className={className}
    />
  );
}
