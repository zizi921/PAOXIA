// Normalized vector strokes stay editable and do not depend on temporary files.
Component({
  data: { boardHeight: 225 },
  properties: {
    strokes: { type: Array, value: [], observer() { if (!this.active) this.redraw(); } },
    editable: { type: Boolean, value: false },
    fullMessage: { type: String, value: 'Drawing full. Undo to continue.' },
    tool: { type: String, value: 'pen' },
    color: { type: String, value: '#262622' }
  },
  lifetimes: {
    ready() {
      this.createSelectorQuery().select('.board').fields({ node: true, size: true }).exec(result => {
        const item = result && result[0];
        if (!item || !item.node || !item.width) return;
        this.canvas = item.node;
        this.width = item.width;
        this.height = item.width * 0.75;
        this.setData({ boardHeight: this.height });
        const ratio = wx.getSystemInfoSync().pixelRatio || 1;
        this.canvas.width = item.width * ratio;
        this.canvas.height = this.height * ratio;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.scale(ratio, ratio);
        this.redraw();
      });
    }
  },
  pageLifetimes: { hide() { this.finish(); } },
  methods: {
    point(event) {
      const touch = event.touches && event.touches[0];
      if (!touch) return null;
      return [touch.x / this.width, touch.y / this.height].map(value => Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000);
    },
    paint(stroke) {
      if (!this.ctx || !stroke || !Array.isArray(stroke.points) || !stroke.points.length) return;
      const ctx = this.ctx;
      ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
      ctx.strokeStyle = stroke.color || '#262622';
      ctx.fillStyle = stroke.color || '#262622';
      ctx.lineWidth = this.width * (stroke.erase ? 0.055 : 0.008);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const points = stroke.points;
      ctx.beginPath();
      ctx.moveTo(points[0][0] * this.width, points[0][1] * this.height);
      if (points.length === 1) {
        ctx.arc(points[0][0] * this.width, points[0][1] * this.height, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        points.slice(1).forEach(p => ctx.lineTo(p[0] * this.width, p[1] * this.height));
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    redraw() {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.width, this.height);
      (this.properties.strokes || []).forEach(stroke => this.paint(stroke));
    },
    start(event) {
      if (!this.properties.editable || !this.ctx) return;
      this.remaining = 6000 - this.properties.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);
      if (this.properties.strokes.length >= 120 || this.remaining <= 0) {
        wx.showToast({ title: this.properties.fullMessage, icon: 'none' });
        return;
      }
      const point = this.point(event);
      if (!point) return;
      this.active = { erase: this.properties.tool === 'eraser', color: this.properties.color || '#262622', points: [point] };
      this.paint(this.active);
    },
    move(event) {
      if (!this.active) return;
      const point = this.point(event);
      if (!point) return;
      if (this.active.points.length >= this.remaining) {
        this.finish();
        wx.showToast({ title: this.properties.fullMessage, icon: 'none' });
        return;
      }
      const previous = this.active.points[this.active.points.length - 1];
      if (Math.hypot(point[0] - previous[0], point[1] - previous[1]) < 0.002) return;
      this.active.points.push(point);
      this.paint({ erase: this.active.erase, color: this.active.color, points: [previous, point] });
    },
    finish() {
      if (!this.active) return;
      const stroke = this.active;
      this.active = null;
      this.triggerEvent('change', { strokes: [...this.properties.strokes, stroke] });
    }
  }
});
