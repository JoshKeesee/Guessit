const resetItems = (grid, r = true) => {
  const children = [...grid.children];
  children.forEach((c) => setItemPosition(null, c, null, r));
};

const setItemPosition = (g, c, p, r = false) => {
  if (r) {
    c.style.position = "";
    c.style.top = "";
    c.style.left = "";
    c.style.width = "";
    c.style.height = "";
    c.getAnimations().forEach((a) => a.cancel());
    return;
  }
  c.style.position = "absolute";
  c.style.top = p.y - g.y + "px";
  c.style.left = p.x - g.x + "px";
  c.style.width = p.width + "px";
  c.style.height = p.height + "px";
};

const animateGridItem = (
  g,
  c,
  n,
  p,
  i,
  { duration = 500, stagger = 0, easing = "ease", ...opts }
) => {
  if (p.x == n.x && p.y == n.y && p.width == n.width && p.height == n.height)
    maxI++;
  setItemPosition(g, c, p);
  c.animate(
    [
      {
        position: "absolute",
        top: p.y - g.y + "px",
        left: p.x - g.x + "px",
        width: p.width + "px",
        height: p.height + "px",
      },
      {
        position: "absolute",
        top: n.y - g.y + "px",
        left: n.x - g.x + "px",
        width: n.width + "px",
        height: n.height + "px",
      },
    ],
    {
      id: g.id + "-" + i,
      duration,
      easing,
      delay: (i - maxI) * stagger,
      ...opts,
    }
  );
  setTimeout(
    () => setItemPosition(g, c, n),
    (i - maxI) * stagger + duration - 10
  );
};

const animateGrid = async (grid, after, opts = {}, afterAll = () => {}) => {
  if (grid.dataset.t) {
    clearTimeout(grid.dataset.t);
    delete grid.dataset.t;
  }
  const prevFilePositions = [],
    nextFilePositions = [];
  let children = [...grid.children];
  if (opts.reverse) children = children.reverse();
  const origNum = children.length;
  children.forEach((c, i) => {
    const n = c.getBoundingClientRect();
    prevFilePositions[i] = {
      width: n.width.toFixed(0),
      height: n.height.toFixed(0),
      x: n.x.toFixed(0),
      y: n.y.toFixed(0),
    };
  });
  resetItems(grid);
  if (opts.sync) await after();
  else after();
  children = [...grid.children];
  if (opts.reverse) children = children.reverse();
  if (children.length > origNum) {
    for (let i = origNum; i < children.length; i++) {
      const c = children[i];
      const n = c.getBoundingClientRect();
      prevFilePositions[i] = nextFilePositions[i] = {
        width: n.width.toFixed(0),
        height: n.height.toFixed(0),
        x: n.x.toFixed(0),
        y: n.y.toFixed(0),
      };
    }
  }
  children.forEach((c, i) => {
    const n = c.getBoundingClientRect();
    nextFilePositions[i] = {
      width: n.width.toFixed(0),
      height: n.height.toFixed(0),
      x: n.x.toFixed(0),
      y: n.y.toFixed(0),
    };
  });
  const g = grid.getBoundingClientRect();
  maxI = 0;
  children.forEach((c, i) => {
    const n = nextFilePositions[i];
    const p = prevFilePositions[i];
    animateGridItem(g, c, n, p, i, opts);
  });
  grid.dataset.t = setTimeout(
    () => resetItems(grid),
    (children.length - maxI) * (opts.stagger || 0) + (opts.duration || 500) + 10
  );
  afterAll();
};
