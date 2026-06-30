// Holds the level's objects/missions and tracks completion. Pure (no Phaser).
export class MissionManager {
  constructor(objects = []) {
    this.objects = objects;
    this.byId = new Map(objects.map((o) => [o.id, o]));
    this.done = new Set();
  }

  getMission(objectId) {
    return this.byId.get(objectId) || null;
  }

  complete(objectId) {
    if (this.byId.has(objectId)) this.done.add(objectId);
  }

  isComplete(objectId) {
    return this.done.has(objectId);
  }

  // mission objects = those that carry a `mission` field
  missionObjects() {
    return this.objects.filter((o) => o.mission);
  }

  remaining() {
    return this.missionObjects().filter((o) => !this.done.has(o.id));
  }

  isLevelComplete() {
    return this.remaining().length === 0;
  }
}

export default MissionManager;
