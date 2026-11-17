const poses = {
  read: [677, 1100],
  point: [844, 1100],
  scan: [663, 1100],
  stand: [723, 1100],
  refuse: [715, 1100],
  tablet: [708, 1100],
  wave: [767, 1100],
  standby: [725, 1100],
  thumbs: [708, 1100],
  peek: [552, 826],
  cheer: [865, 1100],
} as const;

export function Clerk({
  pose,
  eager = false,
}: {
  pose: keyof typeof poses;
  eager?: boolean;
}) {
  const [width, height] = poses[pose];
  return (
    <img
      className="clerk-pose"
      src={`/clerk-hd/${pose}.webp`}
      width={width}
      height={height}
      alt=""
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
    />
  );
}
