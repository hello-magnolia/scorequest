/* ============================================================
   ScoreQuest: creature profiles for battle Engine 2 (js/battle2.js) and the Creature Lab (lab.html)
   ------------------------------------------------------------
   One entry per creature. The engine works out every scale, contact point and launch point
   from these numbers, so tune a creature HERE (or in the lab, then paste "Copy profile" back).

   Frames come from tools/make_creature.py, which prints the first line of numbers:
     dir     where the pose frames live
     w, h    the frame canvas in pixels (the drawing plus padding for ears thrown back etc.)
     art     how tall the drawing itself is, in pixels
     feet    empty rows under the feet in the frame
     size    how tall the creature really is, in world units (ears, carrot and all).
             Pomelo 36, Lantern Rabbit 28: Pomelo is about 1.3 times the rabbit.
     spot    the end of the field its drawing was made for: 'near' (seen from behind) or 'far'
     farArt  near creatures only: the scale of its far_ frames (true small sprites)
   Measured by eye in the lab with Size guides on (all in the drawing's own pixels):
     front   centre of the frame to the tip of the nose
     mid     feet to the centre of the body (where hits land)
     head    { x forward of centre, y above the feet }: where bumps land and Zs rise from
     launch  { x, y }: where a thrown spark or light leaves from
     carry   optional { x, y }: where the thing it throws sits on it (Pomelo's orange, the centre of the fruit).
             With carry and the frames orange, bare, bare_rear, its first move throws that instead of a spark.
   And how it behaves:
     faces   1 if the drawing faces right, -1 if left
     article true if lines should read "The Lantern Rabbit ..." rather than "Pomelo ..."
     alt     an idle frame set to cut in now and then (blink0..3), or null
     tint    the colour of its after-images
     breath  idle timing in frames: rest, sink, out-breath, rise, offset
     poses   every frame file it has. A pose it lacks falls back to idle.
             near creatures use: crouch rear hurt cheer sleep (+ far_idle far_crouch far_rear)
             far creatures use:  windup leap hurt bow happy (+ blink0..3)
   ============================================================ */
window.SQ_CREATURES = {
  'pomelo': {
    name: 'Pomelo', dir: 'assets/creatures/pomelo/', w: 45, h: 53, art: 45, feet: 5, size: 36, spot: 'near', farArt: 0.8,
    front: 20.5, mid: 22, head: { x: 9, y: 30 }, launch: { x: 18, y: 47 }, carry: { x: 10, y: 38 },
    faces: 1, article: false, alt: null, tint: '#ffd9a0', breath: [52, 9, 46, 9, 25],
    poses: ['idle', 'idle0', 'idle1', 'idle2', 'idle3', 'crouch', 'rear', 'hurt', 'cheer', 'sleep', 'far_idle', 'far_crouch', 'far_rear', 'orange', 'bare', 'bare_rear']
  },
  'lantern-rabbit': {
    name: 'Lantern Rabbit', dir: 'assets/creatures/lantern-rabbit/', w: 40, h: 30, art: 28, feet: 0, size: 28, spot: 'far',
    front: 14, mid: 14, head: { x: 8, y: 10 }, launch: { x: 8, y: 23 },
    faces: 1, article: true, alt: 'blink', tint: '#e6dcff', breath: [40, 8, 36, 8, 0],
    poses: ['idle', 'idle0', 'idle1', 'idle2', 'idle3', 'blink0', 'blink1', 'blink2', 'blink3', 'windup', 'leap', 'hurt', 'bow', 'happy']
  }
};
