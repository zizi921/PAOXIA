Component({
  properties: {
    shape: { type: Object, value: null, observer() { this.draw(); } },
    label: { type: String, value: 'Run outline' }
  },
  lifetimes: {
    ready() {
      this.createSelectorQuery().select('.outline').fields({ node: true, size: true }).exec(items => {
        const item = items && items[0];
        if (!item || !item.node || !item.width) return;
        this.canvas = item.node;
        this.width = item.width; this.height = item.height;
        const ratio = wx.getSystemInfoSync().pixelRatio || 1;
        this.canvas.width = item.width * ratio; this.canvas.height = item.height * ratio;
        this.ctx = this.canvas.getContext('2d'); this.ctx.scale(ratio, ratio);
        this.draw(); this.triggerEvent('layoutready');
      });
    }
  },
  methods: {
    draw() {
      if (!this.ctx) return;
      const shape = this.properties.shape;
      const signature = JSON.stringify(shape);
      if (signature === this.signature) return;
      this.signature = signature;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);
      if (!shape || !Array.isArray(shape.segments)) return;
      ctx.strokeStyle = '#edf4fa'; ctx.lineWidth = 6;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      shape.segments.forEach(segment => {
        if (!Array.isArray(segment) || segment.length < 2) return;
        ctx.beginPath();
        segment.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p[0] * this.width, p[1] * this.height);
          else ctx.lineTo(p[0] * this.width, p[1] * this.height);
        });
        ctx.stroke();
      });
    }
  }
});
