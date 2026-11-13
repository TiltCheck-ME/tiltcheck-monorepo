// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Myth or Math, general cards: everyday myths, body and science, probability and maths puzzles,
// common misconceptions. Mixed into every run alongside the gambling cards in mythBank.ts (half and
// half), so the odds lessons sit next to ordinary trivia instead of being the whole deck.
// SERVER AND TESTS ONLY, like mythBank.ts: the browser build never imports this file (mythBank.ts is
// aliased to the guest deck in vite.config.ts, and this file is only reached through it).
//
// Only well-established facts; anything contested was left out. Each card has a short source note.
// Money-words guard: this file gets NO exception in tests/no-money.test.ts. Every banned word applies.

type Row = [id: string, text: string, truth: boolean, why: string];

export const GENERAL_ROWS: Row[] = [
  // Everyday myths.
  // Lab studies (e.g. Univ. of Plymouth, 2003) trained goldfish and saw recall over weeks to months.
  ['n01', 'Goldfish only remember things for about three seconds.', false, 'Goldfish can be trained to do tasks and remember them for months.'],
  // Scientific American, "Do people only use 10 percent of their brains?" (2008).
  ['n02', 'Most people only use 10% of their brain.', false, 'Brain scans show activity across nearly the whole brain over a day. No part sits idle.'],
  // NOAA / National Weather Service lightning safety: the Empire State Building is struck about 20-25 times a year.
  ['n03', 'Lightning can strike the same place twice.', true, 'Tall structures get hit over and over. The Empire State Building takes about 20 to 25 strikes a year.'],
  // NASA, "Great Wall of China" (Earth Observatory / astronaut accounts).
  ['n04', 'You can see the Great Wall of China from the Moon with the naked eye.', false, "It's long but narrow. Astronauts say it can't be seen from the Moon, and it's hard to spot even from low orbit."],
  // USGS / Bat Conservation International: no bat species is blind.
  ['n05', 'Bats are blind.', false, 'Every bat species can see. Many also use echolocation, but none are blind.'],
  // Britannica: cattle are red-green dichromats; the cape's motion provokes the charge.
  ['n06', 'Bulls charge at a cape because it is red.', false, "Cattle can't tell red from green. The cape's movement sets them off, not its color."],
  // Standard physiology: balance (vestibular), proprioception, temperature, pain and more.
  ['n07', 'Humans have more than five senses.', true, 'Balance, body position, temperature and pain are senses too. The list of five is a simplification.'],
  // Smithsonian Magazine; the "tongue map" traces to a misreading of Hänig (1901).
  ['n08', 'Each part of the tongue tastes a different flavor, like sweet only at the front.', false, 'All taste areas pick up every basic taste. The tongue map came from a misread 1901 paper.'],
  // NOAA / USGS: Mauna Kea is about 10,200 m from its base on the seafloor, Everest 8,849 m above sea level.
  ['n09', 'Mount Everest is the tallest mountain on Earth measured from base to peak.', false, 'Mauna Kea in Hawaii is taller from its base on the seafloor. Everest has the highest summit above sea level.'],
  // Britannica: Napoleon was about 1.69 m (5 ft 7 in), average for his time; French inches were longer.
  ['n10', 'Napoleon was unusually short.', false, 'He was about 5 ft 7 in, average for his day. Old French units made his height sound smaller.'],
  // Britannica: Mars is red from iron oxide in its dust and rocks (NASA).
  ['n11', 'Mars looks red because of rust-like iron oxide in its dust.', true, 'Iron oxide in the dust and rocks gives Mars its color.'],
  // Britannica / NASA: Antarctica (~14 million km²) is the largest desert; deserts are defined by low precipitation.
  ['n12', 'The Sahara is the largest desert on Earth.', false, 'Antarctica is larger. A desert is defined by how little precipitation it gets, not by heat.'],
  // Peer-reviewed vision research (Neitz et al., 1989): dogs are dichromats, seeing blues and yellows.
  ['n13', 'Dogs only see in black and white.', false, 'Dogs see color, mostly blues and yellows, much like a person with red-green colorblindness.'],
  // Smithsonian / NOAA: two branchial hearts and one systemic heart.
  ['n14', 'Octopuses have three hearts.', true, 'Two pump blood through the gills and one pumps it around the rest of the body.'],
  // WHO (malaria alone ~600,000 deaths a year); Florida Museum ISAF: a handful of shark deaths a year.
  ['n15', 'Mosquitoes kill more people each year than sharks do.', true, 'Diseases spread by mosquitoes kill hundreds of thousands a year. Sharks cause fewer than ten deaths in a typical year.'],
  // Botanical definition (Britannica): a berry develops from one flower with one ovary.
  ['n16', 'Botanically, bananas are berries and strawberries are not.', true, 'A berry comes from one flower with one ovary. Bananas fit. Strawberries are aggregate fruits.'],
  // USDA / Britannica: peanuts are legumes (family Fabaceae).
  ['n17', 'Peanuts are not actually nuts.', true, 'Peanuts are legumes, in the same family as peas and beans.'],
  // Britannica: a tomato is botanically a fruit (a berry).
  ['n18', 'Botanically, a tomato is a fruit.', true, 'It grows from the flower and holds the seeds, which makes it a fruit. Cooks just treat it as a vegetable.'],

  // Body and science.
  // BMJ 2007, "Medical myths" (Vreeman & Carroll).
  ['n19', 'Hair and fingernails keep growing after death.', false, "Skin dries and pulls back after death, so hair and nails look longer. They don't grow."],
  // BMJ 2008, "Festive medical myths": heat loss from the head is roughly in line with its surface area.
  ['n20', 'You lose most of your body heat through your head.', false, "The head loses heat in line with its share of skin. It only seems like more when it's the one part uncovered."],
  // Unger 1998 (Arthritis & Rheumatism); Harvard Health.
  ['n21', 'Cracking your knuckles causes arthritis.', false, 'Studies, including one man who cracked one hand for 60 years, found no link to arthritis.'],
  // Wolraich et al., JAMA 1995 meta-analysis of double-blind trials.
  ['n22', 'Sugar makes kids hyperactive.', false, 'Blinded trials find no change in behavior from sugar. Parents who think a kid had sugar rate them as more hyper.'],
  // Mayo Clinic: swallowed gum passes through the digestive tract.
  ['n23', 'Swallowed gum stays in your stomach for seven years.', false, "Gum isn't digested, but it moves through and out of the body in days like anything else you can't digest."],
  // CDC, "Antibiotic Do's and Don'ts".
  ['n24', 'Antibiotics kill viruses.', false, 'Antibiotics work on bacteria. They do nothing against viruses like colds and the flu.'],
  // Britannica: newborns have roughly 270-300 bones; adults about 206 after fusion.
  ['n25', 'An adult has more bones than a newborn baby.', false, 'Babies have around 270 to 300 bones. Many fuse as they grow, leaving about 206 in adults.'],
  // NIH / NHGRI, chimpanzee genome (2005): about 98.8% of DNA in common.
  ['n26', 'Humans and chimpanzees share about 98% of their DNA.', true, 'Comparing the two genomes shows about 98.8% of the DNA is the same.'],
  // Mayo Clinic / Harvard Health: alcohol dilates skin blood vessels and speeds core heat loss.
  ['n27', 'A drink of alcohol warms your body up in the cold.', false, 'It widens blood vessels near the skin, so you feel warm while your core loses heat faster.'],
  // USGS Water Science School: pure water is a poor conductor; dissolved salts carry current.
  ['n28', 'Water conducts electricity mostly because of what is dissolved in it.', true, 'Pure water is a poor conductor. Salts and minerals in tap water and sea water carry the current.'],
  // NOAA, "How fast does sound travel?": ~1,480 m/s in water vs ~343 m/s in air.
  ['n29', 'Sound travels faster in water than in air.', true, 'About 1,480 meters a second in water versus about 343 in air, more than four times faster.'],
  // NASA, Apollo 15 hammer and feather drop (1971).
  ['n30', 'In a vacuum, heavy objects fall faster than light ones.', false, 'With no air, everything falls at the same rate. An Apollo 15 astronaut showed it with a hammer and a feather.'],
  // NASA Space Place: seasons come from axial tilt; perihelion is in early January.
  ['n31', "Summer happens because Earth is closer to the Sun.", false, "Earth's tilt causes seasons. Earth is closest to the Sun in early January, during northern winter."],
  // USDA / USGS: water boils near 202°F (about 94-95°C) at Denver's altitude.
  ['n32', 'Water boils at a lower temperature high up a mountain.', true, 'Lower air pressure lets water boil sooner. In Denver it boils at about 202°F instead of 212°F.'],
  // NASA: Venus rotates once every ~243 Earth days and orbits the Sun in ~225.
  ['n33', 'Venus takes longer to spin once on its axis than to go around the Sun.', true, 'One spin takes about 243 Earth days. One trip around the Sun takes about 225.'],
  // Smithsonian / Britannica: non-avian dinosaurs died out ~66 million years ago; Homo sapiens ~300,000 years.
  ['n34', 'Early humans lived alongside T. rex.', false, 'T. rex died out about 66 million years ago. Modern humans showed up around 300,000 years ago.'],

  // Probability and maths.
  // Standard birthday problem: P(shared) with 23 people = 50.7%.
  ['n35', 'In a group of 23 people, there is a better than even chance two share a birthday.', true, 'With 23 people there are 253 possible pairs. The chance of a shared birthday is about 50.7%.'],
  // Monty Hall problem, standard rules (host knows and always opens a losing door).
  ['n36', 'In the Monty Hall puzzle, switching doors wins about two-thirds of the time.', true, 'The host always opens a losing door. Your first pick wins 1 in 3, so switching wins the other 2 in 3.'],
  // Computed exactly: P(run of 5+ of one side in 100 fair flips) ≈ 0.97.
  ['n37', 'In 100 fair coin flips, a streak of 5 or more of the same side is likely.', true, 'It happens about 97% of the time. Long streaks feel rare but turn up all the time.'],
  // Arithmetic: 1.5 × 0.5 = 0.75.
  ['n38', 'A 50% rise followed by a 50% drop gets you back where you started.', false, 'Up 50% then down 50% leaves you at 75%. The drop is taken from a bigger number.'],
  // Arithmetic: 0.8 × 0.8 = 0.64, so 36% off.
  ['n39', '20% off, then another 20% off, is the same as 40% off.', false, "It's 36% off. The second 20% comes off the lower price: 0.8 × 0.8 = 0.64."],
  // Rule of 72; exact doubling time at 7% is ln 2 / ln 1.07 = 10.2 years.
  ['n40', 'At 7% compound interest a year, an amount roughly doubles in about 10 years.', true, 'Rule of 72: divide 72 by the rate. 72 / 7 is about 10. The exact answer is 10.2 years.'],
  // Definition of compound vs simple interest.
  ['n41', 'Compound interest ends up ahead of simple interest at the same rate.', true, 'Compounding earns interest on earlier interest, so it pulls ahead after the first period.'],
  // Standard real analysis: 0.999... = 1.
  ['n42', '0.999... with the 9s going on forever is exactly equal to 1.', true, '1/3 is 0.333..., and three times that is 0.999.... There is no number between it and 1.'],
  // 52! ≈ 8.07 × 10^67; Earth has roughly 10^50 atoms.
  ['n43', 'A deck of 52 cards has more possible orders than there are atoms on Earth.', true, '52 factorial is about 8 × 10^67. Earth has roughly 10^50 atoms.'],
  // 0.1 mm × 2^42 ≈ 440,000 km; mean Earth-Moon distance ~384,400 km (NASA).
  ['n44', 'A sheet of paper folded in half 42 times would be thick enough to reach the Moon.', true, 'Thickness doubles each fold. 0.1 mm × 2^42 is about 440,000 km. The Moon is about 384,000 km away.'],
  // Base-rate fallacy (Bayes' theorem), standard statistics teaching.
  ['n45', 'If a test is 99% accurate and you test positive, you are 99% likely to have the condition.', false, 'It depends on how common the condition is. For a rare one, most positives can be false alarms.'],
  // Independence: the younger child is 50/50 regardless of the older one.
  ['n46', 'A family has two kids and the older one is a girl. The chance both are girls is 1 in 2.', true, "The older child doesn't change the younger one's odds. It's 50/50."],
  // Arithmetic: x% of y = y% of x.
  ['n47', '50% of 20 is the same as 20% of 50.', true, 'x% of y always equals y% of x. Both come to 10.'],
  // 1 - 0.99^50 ≈ 0.395.
  ['n48', 'Something with a 1 in 100 chance each year is very unlikely to happen within 50 years.', false, 'Over 50 years the chance is 1 − 0.99^50, about 39%. Small yearly chances add up.'],
  // Definitions of mean and median.
  ['n49', 'The average and the median of a set of numbers are always the same.', false, 'The median is the middle value. A few very large values pull the average up but barely move the median.'],
  // Law of large numbers.
  ['n50', 'Flip a fair coin enough times and the share of heads gets close to half.', true, 'The law of large numbers. The share settles near 50% as flips pile up, even if the raw gap grows.'],
  // Arithmetic.
  ['n51', 'Multiplying a number always makes it bigger.', false, 'Multiply by anything between 0 and 1 and it shrinks. Half of 10 is 5.'],
  // Euclid, Elements IX.20.
  ['n52', 'There are infinitely many prime numbers.', true, "Euclid proved it about 2,300 years ago: multiply any list of primes, add 1, and none of them divide the result."],
  // Cantor's diagonal argument (1891).
  ['n53', 'Some infinities are bigger than others.', true, "Cantor showed the real numbers can't be listed one by one, so there are more of them than whole numbers."],
  // Clumping in true randomness; Spotify engineering blog (2014) on making shuffle less random.
  ['n54', 'If a shuffle plays two songs by the same artist back to back, it is not really random.', false, 'Real shuffles repeat artists often. Some music apps made shuffle less random so it would feel more random.'],
  // 0.5^5 = 1/32.
  ['n55', 'Guessing on a 5-question true-or-false quiz gets all five right about 1 time in 32.', true, 'Each guess is 1 in 2, and 2 × 2 × 2 × 2 × 2 is 32.'],
  // 1/6 vs 1/36.
  ['n56', 'Rolling a 6 on one die is more likely than rolling a total of 12 with two dice.', true, 'One die: 1 in 6. Two dice need double six: 1 in 36.'],

  // Common misconceptions.
  // Einstein Archives / Britannica: he had mastered calculus by about 15.
  ['n57', 'Einstein failed math at school.', false, 'He was strong at math and had taught himself calculus by about 15.'],
  // Britannica / historians (Jeffrey Burton Russell, "Inventing the Flat Earth", 1991).
  ['n58', 'People in the Middle Ages widely believed the Earth was flat.', false, 'Educated medieval Europeans knew Earth was round. The flat-Earth story about them spread in the 1800s.'],
  // Cleopatra died 30 BC; Great Pyramid ~2560 BC; Moon landing 1969.
  ['n59', 'Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.', true, 'The Great Pyramid was about 2,500 years old in her day. The Moon landing came about 2,000 years after her.'],
  // University of Oxford (teaching by 1096); Tenochtitlan founded 1325 (Britannica).
  ['n60', 'Oxford University is older than the Aztec Empire.', true, 'Teaching at Oxford dates to about 1096. The Aztec city of Tenochtitlan was founded in 1325.'],
];
