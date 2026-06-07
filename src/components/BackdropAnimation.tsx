import React from "react";

interface BackdropAnimationProps {
  gridEnabled: boolean;
  animationSpeed: "slower" | "normal" | "static";
}

export function BackdropAnimation({ gridEnabled, animationSpeed }: BackdropAnimationProps) {
  // Compute inline styles based on speed configuration to override standard animations seamlessly
  const getSpeedStyles = (isSecond: boolean): React.CSSProperties => {
    if (animationSpeed === "static") {
      return { animationPlayState: "paused" };
    }
    if (animationSpeed === "slower") {
      return { animationDuration: isSecond ? "75s" : "60s" };
    }
    return {}; // use CSS default normal durations
  };

  return (
    <div id="backdrop-container" className="fixed inset-0 -z-50 overflow-hidden bg-brand-dark transition-colors duration-1000">
      {/* Mesh Gradient 1 */}
      <div 
        id="glow-element-1"
        className="animate-float-1 absolute -top-[10%] left-[15%] h-[400px] w-[400px] rounded-full bg-brand-neon/8 opacity-[0.07] blur-[120px] transition-all duration-1000"
        style={getSpeedStyles(false)}
      />
      {/* Mesh Gradient 2 */}
      <div 
        id="glow-element-2"
        className="animate-float-2 absolute -bottom-[10%] right-[10%] h-[450px] w-[450px] rounded-full bg-brand-cyan/6 opacity-[0.06] blur-[130px] transition-all duration-1000"
        style={getSpeedStyles(true)}
      />

      {/* Cybernetic Digital Grid Accent overlay */}
      {gridEnabled && (
        <div 
          id="grid-accent-overlay"
          className="absolute inset-0 bg-[linear-gradient(to_right,#141418_1.5px,transparent_1.5px),linear-gradient(to_bottom,#141418_1.5px,transparent_1.5px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-[0.45] transition-opacity duration-500"
        />
      )}
    </div>
  );
}
