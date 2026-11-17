const poses = {
  read: [315, 466],
  point: [385, 465],
  stand: [319, 468],
  refuse: [436, 448],
  tablet: [300, 458],
  wave: [364, 466],
  standby: [299, 482],
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
      src={`/clerk/clerk-${pose}.webp`}
      width={width}
      height={height}
      alt=""
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
    />
  );
}
