// Accumulates framingScore per completed object. No time component. Pure.
export class ScoreManager {
  constructor(objects = [], config) {
    this.config = config;
    // max = base over every MISSION object (those with a mission)
    this.missionCount = objects.filter((o) => o.mission).length;
    this.max = this.missionCount * config.base;
    this.breakdown = {}; // objectId -> score
  }

  add(objectId, score) {
    this.breakdown[objectId] = score;
  }

  get total() {
    return Object.values(this.breakdown).reduce((a, b) => a + b, 0);
  }
}

export default ScoreManager;
