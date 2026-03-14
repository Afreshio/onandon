/**
 * Predictive poetry engine using Markov chains.
 * Generates poetry from a seed word based on word transition probabilities.
 */

const POETRY_CORPUS = `
true love waits in silence beneath the moon
true hearts entwine like vines in summer light
true darkness folds around the fading day
the moon is true companion to the night
love speaks true words when all else fails to say
the stars hold true above the restless sea
in truth the wind carries forgotten names
we find our truth in rain and falling leaves
true moments pass like sand through open hands
the river flows true to the distant sea
beneath the sky where true dreams come to rest
a true word echoes in the empty room
the sun breaks true across the morning hill
true beauty sleeps in ordinary things
love finds its way through true and tangled paths
the night is deep and true and full of grace
we walk in light that true hearts recognize
true silence holds the space between the words
the world turns true beneath the turning stars
in winter cold true warmth survives the frost
true sorrow deepens like the evening shade
the fire burns true through the longest night
true joy arrives when we least expect
the road goes on true to the horizon
in every breath a true connection lives
true wonder waits behind the simplest door
the ocean keeps its true and ancient song
we carry truth like seeds beneath the snow
true hope persists when shadows gather close
the dawn arrives true to its promise
freedom calls from somewhere in the distance
hope rises with the morning light
love moves through shadows and through sun
night holds a thousand silent stars
day breaks across the empty sky
summer leaves fall gently to the earth
winter brings its quiet peace
rain washes over everything we knew
light finds a way through every crack
darkness holds its own kind of truth
dreams carry us beyond the known
heart knows what the mind forgets
wind carries whispers through the trees
sea holds the moon within its waves
sky opens endless and unknown
time moves on and leaves no trace
memory fades like morning mist
beauty lives in ordinary days
silence speaks when words fall short
peace descends like evening rain
stillness holds the world in balance
you know i was thinking about you earlier
i just wanted to say i am still here
if you are awake we can talk now
it feels like the night goes on forever
i am trying to find the right words
maybe we can start again from here
and then we keep going without a plan
because sometimes the smallest message matters
we were talking and then everything got quiet
i could not explain it but i stayed
you and i keep circling back to this
if it helps i can listen for a while
it was never simple but it was real
we kept walking through it together
the way you said it changed everything
for a moment it felt like home
can we begin with one true word
you left a voice note at midnight again
i read your message and sat with it
there is a softness in the way you pause
some days the city sounds like rain
our street keeps the echo of old conversations
the window stays open to the evening air
coffee cools beside an unfinished thought
we hold the ordinary like a fragile lantern
i remember the color of your coat in winter
you asked if healing always feels this slow
we said goodbye and still stayed close
there is a distance that still feels kind
every answer carries another question
the room was quiet except for the clock
the morning train pulled us in different directions
in the hallway your laughter found me first
the table held two cups and too much silence
for once we spoke without trying to win
the sentence broke and then began again
we kept naming the things we never named
the calendar changed but the feeling remained
i wrote it down so i would not forget
you promised nothing and somehow stayed
we waited for clarity and got tenderness
tonight the clouds move like slow music
the pavement shines after a quick storm
birds stitched light across the early sky
the tide returned to the same worn rocks
wildflowers leaned toward a colder sun
autumn carried smoke from distant fields
spring arrived with restless blue mornings
thunder rolled over the valley at dusk
the river bent around the sleeping town
fog rested low across the empty bridge
streetlights trembled in puddles after dark
the orchard held the last pears of summer
branches tapped lightly on the roof
sand clung to our shoes all afternoon
the mountain trail opened above the pines
we crossed the market before it closed
voices rose and fell like small waves
the station lights hummed past midnight
the cafe door rang and someone smiled
pages turned softly in the back row
someone whispered a joke and we laughed
your sweater smelled like cedar and rain
the letter folded into my coat pocket
news arrived late and changed the week
the chorus returned and everyone sang
film grain flickered over an old scene
the headline faded by the next morning
the map showed roads we had not taken
we traded stories while the kettle boiled
your hands shook and then grew still
i breathed in and answered more honestly
it felt complicated and still worth it
we carried grief beside our small joy
the future looked uncertain but open
this moment is enough for now
`;

const CONTEXT_THREADS = [
  [
    'you texted me after midnight and asked if i was awake',
    'i said yes and waited for the typing dots to return',
    'you said you did not know how to begin this',
    'i said begin anywhere and i will follow carefully',
    'you sent a long pause and then one honest sentence',
    'i read it twice before i answered back with kindness',
  ],
  [
    'we met near the station while the rain moved sideways',
    'your jacket was soaked and you laughed anyway',
    'i offered you coffee and you said make it strong',
    'we stood by the window and watched the buses leave',
    'you told me the week had been heavier than expected',
    'i listened without fixing anything and you kept talking',
  ],
  [
    'this morning your message said i need a softer day',
    'i wrote back take your time i am still here',
    'you replied with a photo of the sky over rooftops',
    'the light looked pale and patient above the city',
    'i said that color looks like breathing room',
    'you said maybe that is exactly what i needed',
  ],
  [
    'we kept returning to the same unfinished conversation',
    'each time we found a clearer way to name it',
    'you said i was scared of saying the wrong thing',
    'i said the right thing is usually the truthful thing',
    'you said then here is the truth i miss us',
    'i said i miss us too and left space after it',
  ],
  [
    'at the corner cafe the doorbell rang and rang',
    'someone dropped a spoon and everyone looked up',
    'you smiled at that small ordinary interruption',
    'i said i like when the room feels alive',
    'you said me too it makes loneliness less certain',
    'we stayed until the staff stacked chairs around us',
  ],
  [
    'on sunday we walked along the river before noon',
    'the water carried leaves and reflected broken clouds',
    'you said i have been thinking about forgiveness lately',
    'i asked yourself or someone else and you said both',
    'we walked in silence until the bridge came into view',
    'then you reached for my hand and did not let go',
  ],
  [
    'you called from the grocery aisle and sounded exhausted',
    'i could hear shopping carts and a crying child',
    'you said i forgot why i came here',
    'i said start with bread then fruit then anything warm',
    'you laughed and said okay that feels manageable',
    'later you texted home now soup helps',
  ],
  [
    'the argument ended but the feeling remained in the room',
    'we sat on opposite sides of the couch for a while',
    'you said i do not want to keep hurting us',
    'i said neither do i and i am still willing',
    'you moved closer and asked can we try again slowly',
    'i said yes slowly is good and honest',
  ],
  [
    'your note said i keep rewriting this message',
    'i answered first drafts are allowed with me',
    'you said thank you i needed that permission',
    'then you told me what happened at work',
    'i asked what part felt heaviest to carry',
    'you said pretending i was fine all day',
  ],
  [
    'the train was delayed and the platform filled with sighs',
    'you leaned against my shoulder without saying anything',
    'i asked if you wanted to talk or just stand here',
    'you said just stand here for a minute',
    'we counted passing headlights and breathing cycles',
    'when the train arrived we stepped in together quietly',
  ],
  [
    'some nights we exchange songs instead of explanations',
    'you send a track and i read the lyrics closely',
    'i send one back with a softer chorus',
    'you say that line sounds like us lately',
    'i say maybe that is why it stayed with me',
    'you say keep it on repeat for tomorrow',
  ],
  [
    'you asked if change always feels this uncertain',
    'i said usually yes before it feels like relief',
    'you said i am tired of waiting for relief',
    'i said then let us make smaller promises first',
    'you said okay one promise i will keep showing up',
    'i said mine is i will keep listening fully',
  ],
  [
    'we missed the turn and ended up near the coastline',
    'the road narrowed and opened to a gray horizon',
    'you said maybe wrong turns are still directions',
    'i said especially when we keep paying attention',
    'we parked beside wet rocks and watched the tide climb',
    'you said this feels like a reset and i agreed',
  ],
  [
    'your voicemail was quiet except for your breathing',
    'you said call me when you have a minute',
    'i called back and heard your voice steadying',
    'you said i needed to hear someone safe',
    'i said i am here and not going anywhere',
    'you said thank you that helped more than you know',
  ],
  [
    'the power went out and the apartment turned still',
    'we lit two candles and sat at the kitchen table',
    'you said the dark makes everything feel louder',
    'i said then we can make this hour gentler',
    'we talked until the lights returned without warning',
    'you said i almost wanted them to stay off',
  ],
  [
    'we opened old photos and told stories behind them',
    'you pointed at one and said that day changed me',
    'i asked how and you said i learned patience',
    'i said i learned how to ask for help',
    'you said we were younger but trying our best',
    'i said we are still trying our best now',
  ],
  [
    'at dawn your text said i could not sleep again',
    'i answered with three words breathe with me',
    'you replied okay i am trying right now',
    'i sent a slow count and waited between numbers',
    'you said my chest feels less tight already',
    'i said keep going you are doing well',
  ],
  [
    'we talked about money and fear and future plans',
    'you said numbers make me feel cornered',
    'i said let us do one step at a time',
    'you said one step sounds possible tonight',
    'we wrote a short list and circled the first item',
    'then we cooked dinner and gave our minds a break',
  ],
  [
    'the wind rattled the windows during our late call',
    'you said storms always make me reflective',
    'i said what are you reflecting on tonight',
    'you said how far we came without noticing',
    'i said maybe progress is quiet until we pause',
    'you said then i am pausing and i can see it',
  ],
  [
    'before bed you wrote thank you for today',
    'i wrote back thank you for trusting me',
    'you said i am learning how to do that',
    'i said i am learning how to receive it',
    'you sent a moon emoji and one final goodnight',
    'i put my phone down and felt calmer',
    'we kept breathing together tonight',
  ],
];

const EFFECTIVE_POETRY_CORPUS = `${POETRY_CORPUS.trim()}\n${CONTEXT_THREADS.flat().join('\n')}\n`;

const GRAMMAR_BANK = {
  articles: ['the', 'a', 'an', 'this', 'that', 'these', 'those'],
  determiners: ['my', 'your', 'our', 'their', 'each', 'every', 'some', 'any', 'no'],
  pronouns: ['i', 'you', 'we', 'they', 'he', 'she', 'it', 'someone', 'everyone'],
  prepositions: ['to', 'from', 'with', 'without', 'through', 'between', 'around', 'under', 'over', 'inside', 'before', 'after', 'about', 'into', 'across'],
  conjunctions: ['and', 'but', 'or', 'so', 'yet', 'because', 'while', 'though', 'if', 'when', 'as'],
  auxiliaries: ['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'might', 'must', 'shall', 'have', 'has', 'had'],
  particles: ['not', 'up', 'down', 'out', 'off', 'back', 'away', 'on', 'in'],
  adverbs: ['just', 'still', 'really', 'maybe', 'already', 'always', 'never', 'again', 'together', 'quietly', 'slowly', 'suddenly', 'almost', 'barely', 'gently', 'deeply', 'briefly', 'finally', 'mostly', 'truly'],
  conversationalVerbs: ['think', 'feel', 'know', 'want', 'need', 'mean', 'say', 'talk', 'listen', 'stay', 'leave', 'begin', 'remember', 'notice', 'wonder', 'reach', 'return', 'carry', 'hold', 'share', 'trust', 'admit', 'forgive', 'change', 'breathe', 'follow'],
  conversationalNouns: ['message', 'moment', 'story', 'silence', 'word', 'night', 'morning', 'heart', 'distance', 'home', 'time', 'voice', 'memory', 'window', 'street', 'train', 'station', 'letter', 'kitchen', 'weather', 'music', 'shadow', 'light', 'room', 'future', 'choice'],
  conversationalAdjectives: ['real', 'small', 'quiet', 'honest', 'soft', 'long', 'simple', 'open', 'gentle', 'restless', 'tender', 'fragile', 'distant', 'familiar', 'uncertain', 'steady', 'warm', 'cold', 'bright', 'patient'],
};

const ALL_FALLBACK_WORDS = [
  ...GRAMMAR_BANK.articles,
  ...GRAMMAR_BANK.determiners,
  ...GRAMMAR_BANK.pronouns,
  ...GRAMMAR_BANK.prepositions,
  ...GRAMMAR_BANK.conjunctions,
  ...GRAMMAR_BANK.auxiliaries,
  ...GRAMMAR_BANK.particles,
  ...GRAMMAR_BANK.adverbs,
  ...GRAMMAR_BANK.conversationalVerbs,
  ...GRAMMAR_BANK.conversationalNouns,
  ...GRAMMAR_BANK.conversationalAdjectives,
  'true', 'love', 'light', 'night', 'moon', 'stars', 'wind', 'sea', 'sky',
  'dreams', 'beauty', 'truth', 'hope', 'rain', 'snow', 'freedom', 'memory',
  'river', 'ocean', 'clouds', 'storm', 'dawn', 'dusk', 'valley', 'mountain',
  'streetlights', 'windows', 'coffee', 'train', 'station', 'letter', 'future',
  'healing', 'clarity', 'tenderness', 'conversation', 'question', 'answer',
];

const DOMAIN_LEXICONS = {
  flight: [
    'airport', 'airports', 'plane', 'planes', 'runway', 'gate', 'gates',
    'boarding', 'departure', 'arrivals', 'arrival', 'terminal', 'terminals',
    'pilot', 'pilots', 'cabin', 'window', 'aisle', 'ticket', 'tickets',
    'passport', 'luggage', 'baggage', 'tarmac', 'hangar', 'jet', 'jets',
    'landing', 'takeoff', 'altitude', 'turbulence', 'clouds', 'sky', 'route',
    'delayed', 'schedule', 'seat', 'seats', 'crew', 'intercom',
  ],
  ocean: [
    'tide', 'waves', 'shore', 'salt', 'harbor', 'boats', 'current', 'deep',
    'drift', 'anchor', 'foam', 'horizon', 'coast', 'shells', 'storm',
  ],
  city: [
    'street', 'traffic', 'subway', 'station', 'neon', 'crosswalk', 'downtown',
    'alley', 'crowd', 'taxi', 'rooftops', 'avenue', 'sirens', 'cafe',
  ],
};

function normalizeWord(value) {
  return String(value || '').toLowerCase().replace(/[^\w]/g, '');
}

function tokenizeCorpusLines(corpus) {
  return corpus
    .trim()
    .split('\n')
    .map((line) => line.toLowerCase().replace(/[^\w\s]/g, '').trim().split(/\s+/).filter(Boolean))
    .filter((line) => line.length > 0);
}

function buildLanguageModel(corpusLines) {
  const unigram = new Map();
  const bigram = new Map();
  const trigram = new Map();

  corpusLines.forEach((line) => {
    line.forEach((word, index) => {
      unigram.set(word, (unigram.get(word) || 0) + 1);

      if (index < line.length - 1) {
        const next = line[index + 1];
        if (!bigram.has(word)) bigram.set(word, new Map());
        const nextMap = bigram.get(word);
        nextMap.set(next, (nextMap.get(next) || 0) + 1);
      }

      if (index < line.length - 2) {
        const w1 = word;
        const w2 = line[index + 1];
        const next = line[index + 2];
        const key = `${w1}|${w2}`;
        if (!trigram.has(key)) trigram.set(key, new Map());
        const nextMap = trigram.get(key);
        nextMap.set(next, (nextMap.get(next) || 0) + 1);
      }
    });
  });

  return { unigram, bigram, trigram };
}

function buildMarkovChain(corpus) {
  const words = corpus
    .toLowerCase()
    .replace(/[^\w\s\n]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  const chain = new Map();

  for (let i = 0; i < words.length - 1; i++) {
    const current = words[i];
    const next = words[i + 1];

    if (!chain.has(current)) {
      chain.set(current, []);
    }
    chain.get(current).push(next);
  }

  chain.set('__fallback__', [...new Set(ALL_FALLBACK_WORDS)]);
  return chain;
}

const markovChain = buildMarkovChain(EFFECTIVE_POETRY_CORPUS);
const corpusLines = tokenizeCorpusLines(EFFECTIVE_POETRY_CORPUS);
const languageModel = buildLanguageModel(corpusLines);
const rankedFallback = [...new Set(ALL_FALLBACK_WORDS)]
  .sort((a, b) => (languageModel.unigram.get(b) || 0) - (languageModel.unigram.get(a) || 0));
const PREDICTION_MODEL = {
  beamWidth: 5,
  lookaheadDepth: 3,
  topCandidatesPerStep: 12,
  futureDiscount: 0.82,
  fallbackPoolSize: 14,
};
const NOUN_HEAVY_WORDS = new Set([
  ...GRAMMAR_BANK.conversationalNouns,
  'airport', 'airports', 'plane', 'planes', 'runway', 'gate', 'gates', 'terminal',
  'terminals', 'ticket', 'tickets', 'passport', 'luggage', 'baggage', 'jet', 'jets',
  'street', 'station', 'letter', 'weather', 'music', 'room', 'future', 'choice',
]);
const GRAMMAR_FOCUS_WORDS = new Set([
  ...GRAMMAR_BANK.articles,
  ...GRAMMAR_BANK.determiners,
  ...GRAMMAR_BANK.pronouns,
  ...GRAMMAR_BANK.prepositions,
  ...GRAMMAR_BANK.conjunctions,
  ...GRAMMAR_BANK.auxiliaries,
  ...GRAMMAR_BANK.particles,
  ...GRAMMAR_BANK.adverbs,
]);

function getNextWord(currentWord) {
  const normalized = currentWord.toLowerCase().replace(/[^\w]/g, '');
  const candidates =
    markovChain.get(normalized) ||
    markovChain.get(currentWord.toLowerCase()) ||
    markovChain.get('__fallback__');

  if (!candidates || candidates.length === 0) {
    return markovChain.get('__fallback__')[
      Math.floor(Math.random() * markovChain.get('__fallback__').length)
    ];
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Returns up to `count` unique predictive choices for the next word.
 * This mirrors mobile predictive text by offering a small candidate set.
 */
function getPredictions(currentWord, count = 3) {
  return getPredictionsWithContext(currentWord, [], count);
}

/**
 * Grammar-aware predictor for more natural "conversation-like" suggestions.
 * Uses Markov transitions + part-of-speech style fallback pools.
 */
function getPredictionsWithContext(currentWord, contextWords = [], count = 3) {
  if (typeof contextWords === 'number') {
    count = contextWords;
    contextWords = [];
  }
  if (!Array.isArray(contextWords)) {
    contextWords = [];
  }

  const normalized = normalizeWord(currentWord);
  const baseCandidates =
    markovChain.get(normalized) ||
    markovChain.get(currentWord.toLowerCase()) ||
    markovChain.get('__fallback__');

  const source = Array.isArray(baseCandidates) && baseCandidates.length > 0
    ? baseCandidates
    : markovChain.get('__fallback__');

  const normalizedContext = contextWords.map(normalizeWord).filter(Boolean);
  const seedWord = normalizedContext[0] || normalized;
  const initialRank = rankCandidatesForState(normalizedContext, normalized, source, seedWord);

  // LLM-like local decoding: evaluate short future continuations and then rank
  // first-token choices by their best sequence score.
  let beams = initialRank.ranked
    .slice(0, PREDICTION_MODEL.beamWidth)
    .map((item) => ({ words: [item.word], score: item.score }));

  for (let step = 1; step < PREDICTION_MODEL.lookaheadDepth; step += 1) {
    const expanded = [];
    beams.forEach((beam) => {
      const simulatedContext = [...normalizedContext, ...beam.words];
      const nextCurrent = beam.words[beam.words.length - 1];
      const nextRank = rankCandidatesForState(simulatedContext, nextCurrent, [], seedWord);
      const nextOptions = nextRank.ranked.slice(0, PREDICTION_MODEL.topCandidatesPerStep);

      nextOptions.forEach((option) => {
        expanded.push({
          words: [...beam.words, option.word],
          score: beam.score + (option.score * (PREDICTION_MODEL.futureDiscount ** step)),
        });
      });
    });

    if (expanded.length === 0) break;
    expanded.sort((a, b) => b.score - a.score);
    beams = expanded.slice(0, PREDICTION_MODEL.beamWidth);
  }

  const firstWordBestScore = new Map();
  beams.forEach((beam) => {
    const first = beam.words[0];
    if (!first) return;
    const currentBest = firstWordBestScore.get(first);
    if (currentBest === undefined || beam.score > currentBest) {
      firstWordBestScore.set(first, beam.score);
    }
  });

  const picks = [...firstWordBestScore.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word);

  if (picks.length >= count) return picks;

  for (const fallbackWord of rankedFallback) {
    if (picks.length >= count) break;
    if (!picks.includes(fallbackWord)) {
      picks.push(fallbackWord);
    }
  }

  return picks;
}

function rankCandidatesForState(contextWords, currentWord, baseSource, seedWord) {
  const prev = contextWords[contextWords.length - 1] || normalizeWord(currentWord);
  const prev2 = contextWords[contextWords.length - 2] || '';
  const trigramKey = prev2 ? `${prev2}|${prev}` : '';
  const grammarCandidates = getGrammarCandidates(prev, contextWords);
  const domainCandidates = getDomainCandidates(seedWord, contextWords);
  const markovCandidates =
    markovChain.get(prev) ||
    markovChain.get(normalizeWord(currentWord)) ||
    markovChain.get('__fallback__');

  const source = Array.isArray(baseSource) && baseSource.length > 0
    ? baseSource
    : (Array.isArray(markovCandidates) ? markovCandidates : markovChain.get('__fallback__'));

  const bigramMap = languageModel.bigram.get(prev) || new Map();
  const trigramMap = trigramKey ? (languageModel.trigram.get(trigramKey) || new Map()) : new Map();
  const candidateSet = new Set([
    ...source,
    ...grammarCandidates,
    ...domainCandidates,
    ...rankedFallback.slice(0, PREDICTION_MODEL.fallbackPoolSize),
    ...bigramMap.keys(),
    ...trigramMap.keys(),
  ]);

  const recentTail = contextWords.slice(-4);
  const scored = [];
  candidateSet.forEach((candidate) => {
    const word = normalizeWord(candidate);
    if (!word) return;

    let score = 0;
    const bigramCount = bigramMap.get(word) || 0;
    const trigramCount = trigramMap.get(word) || 0;
    const unigramCount = languageModel.unigram.get(word) || 0;
    const inBaseSource = source.includes(word);
    const inGrammar = grammarCandidates.includes(word);
    const inDomain = domainCandidates.includes(word);

    score += trigramCount * 10;
    score += bigramCount * 6;
    score += unigramCount * 0.12;
    if (inBaseSource) score += 2.4;
    if (inGrammar) score += 1.1;
    if (inDomain) score += 1.25;
    if (GRAMMAR_FOCUS_WORDS.has(word)) score += 2.6;
    if (NOUN_HEAVY_WORDS.has(word) && trigramCount === 0 && bigramCount <= 1) score -= 1.9;
    if (recentTail.includes(word)) score -= 3.2;
    if (word === prev) score -= 2.2;

    scored.push({ word, score, unigramCount });
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.unigramCount !== a.unigramCount) return b.unigramCount - a.unigramCount;
    return a.word.localeCompare(b.word);
  });

  return { ranked: scored, domainCandidates, bigramMap, trigramMap };
}

function chooseDomainWord(domainCandidates, bigramMap, trigramMap, contextWords) {
  const recent = new Set(contextWords.slice(-5));
  let bestWord = '';
  let bestScore = Number.NEGATIVE_INFINITY;

  domainCandidates.forEach((candidate) => {
    const word = normalizeWord(candidate);
    if (!word || recent.has(word)) return;

    let score = 0;
    score += (trigramMap.get(word) || 0) * 3;
    score += (bigramMap.get(word) || 0) * 2;
    if (!recent.has(word)) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestWord = word;
    }
  });

  return bestWord || normalizeWord(domainCandidates[0] || '');
}

function getDomainCandidates(seedWord, contextWords) {
  const contextSet = new Set(contextWords);
  const domainKeys = Object.keys(DOMAIN_LEXICONS);

  for (const key of domainKeys) {
    const lexicon = DOMAIN_LEXICONS[key];
    const inContextCount = contextWords.filter((w) => lexicon.includes(w) || w === key).length;
    const seeded = seedWord === key;

    // Keep domain influence light unless the user continues reinforcing it.
    if (seeded && contextWords.length <= 2) {
      return lexicon.slice(0, 6);
    }
    if (inContextCount >= 2 || contextSet.has(key)) {
      return lexicon.slice(0, 10);
    }
  }

  // Also map common aviation terms back to flight domain.
  const flightTriggers = ['airport', 'airports', 'plane', 'planes', 'runway', 'gate', 'boarding', 'pilot', 'terminal', 'jet', 'jets'];
  const hasFlightSignal = contextWords.some((word) => flightTriggers.includes(word));
  if (hasFlightSignal) {
    return DOMAIN_LEXICONS.flight.slice(0, 8);
  }

  return [];
}

function getGrammarCandidates(currentWord, contextWords) {
  const prevWord = normalizeWord(contextWords[contextWords.length - 1] || currentWord);
  const twoBackWord = normalizeWord(contextWords[contextWords.length - 2] || '');

  const isPronoun = GRAMMAR_BANK.pronouns.includes(prevWord);
  const isAux = GRAMMAR_BANK.auxiliaries.includes(prevWord);
  const isPreposition = GRAMMAR_BANK.prepositions.includes(prevWord);
  const isConjunction = GRAMMAR_BANK.conjunctions.includes(prevWord);
  const isArticle = GRAMMAR_BANK.articles.includes(prevWord);
  const recentlyUsedConjunction = GRAMMAR_BANK.conjunctions.includes(twoBackWord);

  const grammarPool = [];

  if (isPronoun) {
    grammarPool.push(...GRAMMAR_BANK.auxiliaries, ...GRAMMAR_BANK.adverbs, ...GRAMMAR_BANK.particles);
  } else if (isAux) {
    grammarPool.push(...GRAMMAR_BANK.adverbs, ...GRAMMAR_BANK.prepositions, ...GRAMMAR_BANK.conjunctions, ...GRAMMAR_BANK.particles);
  } else if (isPreposition) {
    grammarPool.push(...GRAMMAR_BANK.articles, ...GRAMMAR_BANK.determiners, ...GRAMMAR_BANK.pronouns);
  } else if (isArticle) {
    grammarPool.push(...GRAMMAR_BANK.adverbs, ...GRAMMAR_BANK.prepositions, ...GRAMMAR_BANK.conversationalAdjectives);
  } else if (isConjunction) {
    grammarPool.push(...GRAMMAR_BANK.pronouns, ...GRAMMAR_BANK.articles, ...GRAMMAR_BANK.determiners, ...GRAMMAR_BANK.adverbs);
  } else {
    grammarPool.push(
      ...GRAMMAR_BANK.prepositions,
      ...GRAMMAR_BANK.conjunctions,
      ...GRAMMAR_BANK.auxiliaries,
      ...GRAMMAR_BANK.particles,
      ...GRAMMAR_BANK.adverbs,
      ...GRAMMAR_BANK.pronouns
    );
  }

  // Avoid repetitive conjunction stacks ("and but so").
  if (recentlyUsedConjunction) {
    return grammarPool.filter((w) => !GRAMMAR_BANK.conjunctions.includes(w));
  }

  return grammarPool;
}

/**
 * Generates a sequence of words for a poem, starting from the seed word.
 * Uses Markov chain to predict each subsequent word.
 * @param {string} seedWord - The word to start the poem with
 * @param {number} totalWords - Approximate number of words to generate (default ~40 for ~5 lines)
 * @param {number} wordsPerLine - Approximate words per line for line breaks
 */
function generatePoemSequence(seedWord, totalWords = 42, wordsPerLine = 8) {
  if (!seedWord || !seedWord.trim()) {
    seedWord = 'true';
  }

  const seq = [];
  let current = seedWord.toLowerCase().trim().replace(/[^\w]/g, '') || 'true';

  seq.push(current);

  for (let i = 1; i < totalWords; i++) {
    const nextChoices = getPredictionsWithContext(current, seq, 3);
    const next = nextChoices[0] || getNextWord(current);
    seq.push(next);
    current = next;
  }

  return seq;
}

/**
 * Splits a word sequence into lines for display.
 */
function toLines(words, wordsPerLine = 7) {
  const lines = [];
  let line = [];

  for (const w of words) {
    line.push(w);
    if (line.length >= wordsPerLine) {
      lines.push(line.join(' '));
      line = [];
    }
  }
  if (line.length > 0) {
    lines.push(line.join(' '));
  }
  return lines;
}

window.PoetryEngine = {
  getPredictions: getPredictionsWithContext,
  generatePoemSequence,
  toLines,
};
