const timeAgo = (date) => {
  const rtf = new Intl.RelativeTimeFormat("en", {
    numeric: "auto",
    style: "long",
  });
  const seconds = Math.floor((new Date() - date) / 1000);
  const c = {
    year: 31536000,
    month: 2592000,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1,
  };
  for (let i = 0; i < Object.keys(c).length; i++) {
    const v = Object.keys(c)[i],
      j = Math.floor(seconds / c[v]);
    if (j >= 1) return rtf.format(-j, v);
  }
  return "just now";
};
