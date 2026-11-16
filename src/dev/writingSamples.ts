/**
 * Testing tools: a sample answer for every prompt in prompts.txt, so the
 * writing exercise can be demoed quickly. `es` is a correct translation;
 * `wrong` has one or two typical mistakes, to show the feedback and the
 * second try. Prompts the AI wrote get their topic's first sample.
 */
export interface WritingSample {
  en: string;
  es: string;
  wrong: string;
}

export const WRITING_SAMPLES: Record<string, WritingSample> = {
  // Everyday present
  'Write about what you usually do on a weekday morning.': {
    en: 'On weekday mornings I have a coffee and walk to work.',
    es: 'Entre semana, por las mañanas, me tomo un café y voy andando al trabajo.',
    wrong: 'Entre semana, por las mañanas, me tomo una café y voy andando al trabajo.',
  },
  'Write about a hobby you have and how often you do it.': {
    en: 'I play the guitar three times a week.',
    es: 'Toco la guitarra tres veces a la semana.',
    wrong: 'Juego la guitarra tres veces a la semana.',
  },
  'Write about what someone you know does for work.': {
    en: 'My sister works as a nurse in a big hospital.',
    es: 'Mi hermana trabaja de enfermera en un hospital grande.',
    wrong: 'Mi hermana trabajo de enfermera en un hospital grande.',
  },
  'Write about a food you like and why you like it.': {
    en: 'I like paella because it reminds me of the beach.',
    es: 'Me gusta la paella porque me recuerda a la playa.',
    wrong: 'Me gusto la paella porque me recuerda a la playa.',
  },
  'Write about where you live and who you live with.': {
    en: 'I live in a small flat with two friends.',
    es: 'Vivo en un piso pequeño con dos amigos.',
    wrong: 'Vivo en un piso pequeña con dos amigos.',
  },
  'Write about a place you go to relax.': {
    en: 'I go to the park near my house to relax.',
    es: 'Voy al parque que está cerca de mi casa para relajarme.',
    wrong: 'Voy al parque que es cerca de mi casa para relajarme.',
  },
  "Write about something you're learning right now.": {
    en: "I'm learning Spanish because I want to travel.",
    es: 'Estoy aprendiendo español porque quiero viajar.',
    wrong: 'Estoy aprendiendo español porque quero viajar.',
  },
  'Write about a typical evening at home.': {
    en: 'In the evening I make dinner and read a book.',
    es: 'Por la noche preparo la cena y leo un libro.',
    wrong: 'Por la noche preparo la cena y lee un libro.',
  },

  // Past tenses
  'Write about something you did last weekend.': {
    en: 'Last weekend I went to the mountains with my brother.',
    es: 'El fin de semana pasado fui a la montaña con mi hermano.',
    wrong: 'El fin de semana pasado iba a la montaña con mi hermano.',
  },
  'Write about what your bedroom was like when you were a child.': {
    en: 'When I was a child, my bedroom was small and blue.',
    es: 'Cuando era pequeño, mi habitación era pequeña y azul.',
    wrong: 'Cuando fui pequeño, mi habitación fue pequeña y azul.',
  },
  'Write about a trip you took and one thing that happened on it.': {
    en: 'I went to Lisbon and I lost my phone on the train.',
    es: 'Fui a Lisboa y perdí el móvil en el tren.',
    wrong: 'Fui a Lisboa y perdi el móvil en el tren.',
  },
  'Write about what you used to do after school as a kid.': {
    en: 'After school I used to play football with my friends.',
    es: 'Después del colegio jugaba al fútbol con mis amigos.',
    wrong: 'Después del colegio jugué al fútbol con mis amigos.',
  },
  'Write about the last meal you cooked or ate out.': {
    en: 'Yesterday I cooked pasta with tomato sauce.',
    es: 'Ayer cociné pasta con salsa de tomate.',
    wrong: 'Ayer cocinaba pasta con salsa de tomate.',
  },
  'Write about a day you remember: what the weather was like and what you did.': {
    en: 'It was raining, so we stayed at home and played cards.',
    es: 'Llovía, así que nos quedamos en casa y jugamos a las cartas.',
    wrong: 'Llovió, así que nos quedábamos en casa y jugamos a las cartas.',
  },
  'Write about how you met a good friend.': {
    en: 'I met my best friend at university ten years ago.',
    es: 'Conocí a mi mejor amiga en la universidad hace diez años.',
    wrong: 'Conocí mi mejor amiga en la universidad hace diez años.',
  },
  'Write about what you were doing when you heard some good news.': {
    en: 'I was cooking when my mother called me with the news.',
    es: 'Estaba cocinando cuando mi madre me llamó con la noticia.',
    wrong: 'Estaba cocinando cuando mi madre me llamaba con la noticia.',
  },

  // Future forms
  "Write about what you're going to do this weekend.": {
    en: "This weekend I'm going to visit my grandparents.",
    es: 'Este fin de semana voy a visitar a mis abuelos.',
    wrong: 'Este fin de semana voy visitar a mis abuelos.',
  },
  'Write about where you think you will live in ten years.': {
    en: 'In ten years I will live in a house by the sea.',
    es: 'Dentro de diez años viviré en una casa junto al mar.',
    wrong: 'Dentro de diez años viviría en una casa junto al mar.',
  },
  "Write about something you're going to learn next year.": {
    en: "Next year I'm going to learn to dance salsa.",
    es: 'El año que viene voy a aprender a bailar salsa.',
    wrong: 'El año que viene voy a aprender bailar salsa.',
  },
  "Write about what you'll cook the next time you have friends over.": {
    en: "Next time I'll make a Spanish omelette for my friends.",
    es: 'La próxima vez haré una tortilla de patatas para mis amigos.',
    wrong: 'La próxima vez haceré una tortilla de patatas para mis amigos.',
  },
  "Write about what the weather will be like tomorrow and what you'll do.": {
    en: "Tomorrow it will be sunny, so I'll go for a walk.",
    es: 'Mañana hará sol, así que daré un paseo.',
    wrong: 'Mañana hará sol, así que daré una paseo.',
  },
  "Write about a trip you're planning.": {
    en: "In summer I'm going to travel to Mexico with my partner.",
    es: 'En verano voy a viajar a México con mi pareja.',
    wrong: 'En verano va a viajar a México con mi pareja.',
  },
  "Write about what you're going to do after this exercise.": {
    en: "After this, I'm going to make dinner.",
    es: 'Después de esto, voy a hacer la cena.',
    wrong: 'Después de esto, voy a hacer el cena.',
  },
  'Write about a goal you will reach this year.': {
    en: 'This year I will run my first marathon.',
    es: 'Este año correré mi primer maratón.',
    wrong: 'Este año corré mi primer maratón.',
  },

  // Hypotheticals
  'Write about what you would do with a completely free day.': {
    en: 'With a free day, I would go to the beach to read.',
    es: 'Con un día libre, iría a la playa a leer.',
    wrong: 'Con un día libre, iré a la playa a leer.',
  },
  'Write about where you would live if you could live anywhere.': {
    en: 'If I could live anywhere, I would live in Japan.',
    es: 'Si pudiera vivir en cualquier sitio, viviría en Japón.',
    wrong: 'Si podría vivir en cualquier sitio, viviría en Japón.',
  },
  'Write about what you would do if you won some money.': {
    en: 'If I won some money, I would buy a house for my parents.',
    es: 'Si ganara dinero, compraría una casa para mis padres.',
    wrong: 'Si gano dinero, compraría una casa para mis padres.',
  },
  'Write about something you would change about your job or studies.': {
    en: 'I would work fewer hours and travel more.',
    es: 'Trabajaría menos horas y viajaría más.',
    wrong: 'Trabajaría menos horas y viajaría mas.',
  },
  'Write about a skill you would like to have, and what you would do with it.': {
    en: 'I would like to play the piano so I could play for my family.',
    es: 'Me gustaría tocar el piano para tocar para mi familia.',
    wrong: 'Me gustaría tocar la piano para tocar para mi familia.',
  },
  'Write about what you would cook for a famous guest.': {
    en: 'I would cook a paella for a famous chef.',
    es: 'Cocinaría una paella para un chef famoso.',
    wrong: 'Cocinaría una paella para un chef famosa.',
  },
  'Write about what you would do if it snowed all week.': {
    en: 'If it snowed all week, I would stay at home and watch films.',
    es: 'Si nevara toda la semana, me quedaría en casa viendo películas.',
    wrong: 'Si nevaría toda la semana, me quedaría en casa viendo películas.',
  },
  'Write about who you would invite to dinner if you could invite anyone.': {
    en: 'If I could invite anyone, I would invite my grandfather.',
    es: 'Si pudiera invitar a cualquier persona, invitaría a mi abuelo.',
    wrong: 'Si pudiera invitar a cualquier persona, invitaría mi abuelo.',
  },

  // Ser vs estar
  "Write about someone you know: what they're like, and how they are today.": {
    en: 'My friend Ana is very funny, but today she is tired.',
    es: 'Mi amiga Ana es muy divertida, pero hoy está cansada.',
    wrong: 'Mi amiga Ana está muy divertida, pero hoy es cansada.',
  },
  "Write about your favourite café: where it is and what it's like.": {
    en: 'My favourite café is near the station and it is very quiet.',
    es: 'Mi cafetería favorita está cerca de la estación y es muy tranquila.',
    wrong: 'Mi cafetería favorita es cerca de la estación y es muy tranquila.',
  },
  'Write about how you feel today and why.': {
    en: 'Today I am happy because it is my birthday.',
    es: 'Hoy estoy contento porque es mi cumpleaños.',
    wrong: 'Hoy soy contento porque es mi cumpleaños.',
  },
  "Write about your city: what it's like and where it is.": {
    en: 'My city is big and it is in the north of the country.',
    es: 'Mi ciudad es grande y está en el norte del país.',
    wrong: 'Mi ciudad es grande y es en el norte del país.',
  },
  "Write about a friend's job and where they are right now.": {
    en: 'My friend is a teacher and right now she is in Paris.',
    es: 'Mi amiga es profesora y ahora está en París.',
    wrong: 'Mi amiga está profesora y ahora está en París.',
  },
  "Write about a room in your home and the state it's in today.": {
    en: 'My kitchen is small and today it is very messy.',
    es: 'Mi cocina es pequeña y hoy está muy desordenada.',
    wrong: 'Mi cocina es pequeña y hoy es muy desordenado.',
  },
  'Write about a dish you like: what it is and how it tastes.': {
    en: 'Gazpacho is a cold soup and it is delicious.',
    es: 'El gazpacho es una sopa fría y está buenísimo.',
    wrong: 'El gazpacho es un sopa fría y está buenísimo.',
  },
  "Write about an event you're going to: where it is and what it's for.": {
    en: 'The concert is in the park and it is for charity.',
    es: 'El concierto es en el parque y es para una ONG.',
    wrong: 'El concierto está en el parque y es para una ONG.',
  },
};

/** A sample for a prompt; prompts without one (written by the AI) get a fallback. */
export function sampleFor(prompt: string): WritingSample {
  return WRITING_SAMPLES[prompt] ?? WRITING_SAMPLES['Write about something you did last weekend.'];
}

/** The sample whose English this is, if the learner's English came from a sample. */
export function sampleForEnglish(english: string): WritingSample | undefined {
  return Object.values(WRITING_SAMPLES).find((s) => s.en === english.trim());
}
