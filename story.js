/* A continuous second-person adventure, independent of spelling-tier order.
   Local expeditions resolve every 24 victories; only full mastery ends the war. */
const STORY_REGIONS=['Briarwood','Lantern Marsh','Glasswater','Moonfall','Copperleaf','Winterbell','Sunken Star','Cloudspire'];
const STORY_PLACES=['Crossing','Hollow','Citadel','Reach','Isles','Heights'];
const STORY_FOES=['bramble knight','ink-armored sentinel','paper wyvern','clockwork ogre','shadow hound','storm gargoyle'];
const STORY_BEATS=[
  'You reach {place}, where a black banner rises by itself and Pip, the little fox at your side, spots someone trapped beneath it.',
  'You cut through the banner’s living shadow with your light-forged blade, freeing a scout who presses a cracked compass into your hand.',
  'You turn the compass toward the mountains, and its needle points straight through a wall that has no door.',
  'You trace a bright doorway into the stone and slip through just before the Ink Regent’s searching lantern sweeps across the hillside.',
  'You catch Pip by the scruff as the floor breaks away, then swing together onto a narrow bridge above a roaring underground river.',
  'You raise your shield against a charging {foe}, and the impact sends a shower of golden sparks spinning into the dark.',
  'You duck beneath the creature’s next strike and knock the ink crystal from its armor, leaving an ordinary stone statue blinking in surprise.',
  'You follow the freed guardian’s pointing hand to a chamber where stolen voices flutter inside glass jars.',
  'You break the first jar with a clear ringing note, and a rescued voice whispers the password to the Regent’s hidden stair.',
  'You race up the stair as ink floods the chamber behind you, while Pip leaps ahead to hold the closing hatch.',
  'You burst into a roofless tower and catch a falling star in your shield before it can vanish into the black water below.',
  'You discover a tiny firebird curled inside the star, and it wakes long enough to show you a vision of the Regent’s distant fortress.',
  'You tuck the firebird safely into your cloak and step onto a floating causeway that appears only beneath your feet.',
  'You face a mirror-double wearing your own armor, but Pip’s reflection has no tail and gives the trick away.',
  'You strike the false reflection instead of your companion, shattering the mirror prison and opening a path into the clouds.',
  'You climb onto a great bronze griffin freed from the glass, and its first wingbeat scatters the Regent’s hunting shadows.',
  'You steer the griffin through a storm of flying ink-spears and land beside a beacon whose flame has been stolen.',
  'You brace your shield across the beacon door while Pip crawls beneath it to unfasten the bolt from inside.',
  'You enter the beacon chamber and find the {foe} rebuilt from smoke, guarding a cage of trembling golden light.',
  'You stand your ground as the creature lunges, then turn its own shadow aside with the polished face of your shield.',
  'You send your blade through the cage’s lock, releasing the firebird’s lost flame in a spiral of brilliant gold.',
  'You lift the awakened firebird toward the beacon, and its song drives the smoke-creature apart without harming the guardian inside.',
  'You watch warm lights return across {place} as the freed guardian reveals another route toward the Regent’s fortress.',
  'You share a quiet victory with Pip beneath the restored beacon, then shoulder your shield as the compass reveals the next stretch of your journey.'
];
function storyPlace(index){
  const expedition=Math.floor(index/STORY_BEATS.length);
  return STORY_REGIONS[expedition%STORY_REGIONS.length]+' '+STORY_PLACES[Math.floor(expedition/STORY_REGIONS.length)%STORY_PLACES.length];
}
function storyVictory(index){
  const expedition=Math.floor(index/STORY_BEATS.length),beat=index%STORY_BEATS.length;
  return {
    heading:'Your adventure · Expedition '+(expedition+1)+' · '+(beat+1)+' / '+STORY_BEATS.length,
    text:(STORY_BEATS[beat].includes('{place}')?STORY_BEATS[beat]:STORY_BEATS[beat].replace(/^You /,'In {place}, you ')).replaceAll('{place}',storyPlace(index)).replaceAll('{foe}',STORY_FOES[expedition%STORY_FOES.length])
  };
}
