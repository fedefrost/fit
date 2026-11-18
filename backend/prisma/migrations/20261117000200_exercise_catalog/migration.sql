-- Catálogo inicial de equipamiento y ejercicios (español / inglés). La app solo lo lee.
-- Igual que alimentos y recetas: para corregir o sumar, crear otra migración con este formato
-- (idempotente por "slug").
--
-- Cada ejercicio tiene una animación en frontend/public/exercises/<slug>.png y .gif,
-- generadas con tools/exercise-animations/generate.py.
--
-- Prescripciones base para nivel intermedio (lib/exercise.ts las ajusta al perfil):
--   time        → baseMinutes
--   reps        → baseReps por serie
--   reps_weight → baseReps por serie y loadFactor × peso corporal
-- "met" sale de valores habituales del Compendium of Physical Activities; las calorías
-- son estimaciones.

INSERT INTO "equipment" ("slug", "nameEs", "nameEn") VALUES
('dumbbells', 'Mancuernas', 'Dumbbells'),
('barbell', 'Barra con discos', 'Barbell'),
('bench', 'Banco de ejercicios', 'Exercise bench'),
('stationary_bike', 'Bicicleta fija', 'Stationary bike'),
('pull_up_bar', 'Barra de dominadas', 'Pull-up bar')
ON CONFLICT ("slug") DO UPDATE SET "nameEs" = EXCLUDED."nameEs", "nameEn" = EXCLUDED."nameEn";

INSERT INTO "exercises" ("slug", "muscle", "measure", "met", "baseMinutes", "baseReps", "secondsPerRep", "loadFactor", "highImpact", "nameEs", "nameEn", "instructionsEs", "instructionsEn") VALUES
-- Piernas
('bodyweight_squat', 'legs', 'reps', 5.0, NULL, 15, 3, NULL, false,
 'Sentadilla', 'Bodyweight squat',
 'Pies al ancho de hombros. Baja llevando la cadera hacia atrás como si fueras a sentarte, con la espalda recta y las rodillas en línea con los pies. Sube empujando con los talones.',
 'Feet shoulder-width apart. Lower by pushing your hips back as if sitting down, keeping your back straight and knees in line with your toes. Drive up through your heels.'),
('goblet_squat', 'legs', 'reps_weight', 5.0, NULL, 12, 3, 0.15, false,
 'Sentadilla goblet con mancuerna', 'Dumbbell goblet squat',
 'Sostén una mancuerna vertical contra el pecho. Baja en sentadilla con el torso erguido y los codos entre las rodillas. Sube sin despegar los talones.',
 'Hold a dumbbell vertically against your chest. Squat down with an upright torso and elbows inside your knees. Stand back up keeping your heels down.'),
('barbell_back_squat', 'legs', 'reps_weight', 6.0, NULL, 10, 4, 0.6, false,
 'Sentadilla con barra', 'Barbell back squat',
 'Apoya la barra sobre la parte alta de la espalda. Baja controlando hasta que los muslos queden paralelos al suelo y sube manteniendo el pecho arriba.',
 'Rest the bar on your upper back. Lower under control until your thighs are parallel to the floor and stand up keeping your chest up.'),
('lunges', 'legs', 'reps', 4.0, NULL, 12, 3, NULL, false,
 'Estocadas', 'Lunges',
 'Da un paso largo hacia adelante y baja hasta que ambas rodillas formen 90°. Vuelve a la posición inicial y alterna las piernas.',
 'Take a long step forward and lower until both knees reach 90°. Return to the start and alternate legs.'),
('stationary_bike', 'legs', 'time', 6.8, 20, NULL, 3, NULL, false,
 'Bicicleta fija', 'Stationary bike',
 'Ajusta el asiento a la altura de la cadera. Pedalea a ritmo constante con resistencia moderada, la espalda recta y los hombros relajados.',
 'Set the seat at hip height. Pedal at a steady pace with moderate resistance, back straight and shoulders relaxed.'),

-- Glúteos
('glute_bridge', 'glutes', 'reps', 3.5, NULL, 15, 3, NULL, false,
 'Puente de glúteos', 'Glute bridge',
 'Acostado boca arriba con las rodillas flexionadas, eleva la cadera apretando los glúteos hasta formar una línea recta de hombros a rodillas. Baja despacio.',
 'Lying on your back with knees bent, lift your hips by squeezing your glutes until your body forms a straight line from shoulders to knees. Lower slowly.'),
('hip_thrust', 'glutes', 'reps_weight', 5.0, NULL, 12, 3, 0.5, false,
 'Hip thrust con barra', 'Barbell hip thrust',
 'Apoya la parte alta de la espalda en el banco y la barra sobre la cadera. Empuja la cadera hacia arriba hasta alinearla con el torso y baja controlando.',
 'Rest your upper back on the bench and the bar across your hips. Drive your hips up until they line up with your torso and lower under control.'),
('donkey_kick', 'glutes', 'reps', 3.0, NULL, 15, 2, NULL, false,
 'Patada de glúteo en cuadrupedia', 'Donkey kick',
 'En cuatro apoyos, con la rodilla flexionada, eleva una pierna hacia el techo apretando el glúteo. Baja sin apoyar la rodilla y repite; luego cambia de pierna.',
 'On all fours, with your knee bent, lift one leg toward the ceiling by squeezing your glute. Lower without touching the floor and repeat; then switch legs.'),
('dumbbell_romanian_deadlift', 'glutes', 'reps_weight', 5.0, NULL, 12, 4, 0.2, false,
 'Peso muerto rumano con mancuernas', 'Dumbbell Romanian deadlift',
 'De pie con una mancuerna en cada mano, flexiona apenas las rodillas y lleva la cadera hacia atrás bajando las mancuernas cerca de las piernas. Sube apretando los glúteos.',
 'Standing with a dumbbell in each hand, bend your knees slightly and push your hips back, lowering the weights close to your legs. Stand up squeezing your glutes.'),
('bench_step_up', 'glutes', 'reps', 6.0, NULL, 12, 3, NULL, false,
 'Subida al banco', 'Bench step-up',
 'Apoya un pie completo sobre el banco y sube empujando con esa pierna hasta quedar de pie. Baja controlando y alterna las piernas.',
 'Place one whole foot on the bench and step up by pushing through that leg until standing. Step down under control and alternate legs.'),

-- Bíceps
('dumbbell_curl', 'biceps', 'reps_weight', 3.5, NULL, 12, 3, 0.12, false,
 'Curl de bíceps con mancuernas', 'Dumbbell biceps curl',
 'De pie, con los codos pegados al cuerpo, flexiona los brazos subiendo las mancuernas con las palmas hacia arriba. Baja despacio sin balancear el torso.',
 'Standing with elbows close to your body, curl the dumbbells up with palms facing up. Lower slowly without swinging your torso.'),
('hammer_curl', 'biceps', 'reps_weight', 3.5, NULL, 12, 3, 0.12, false,
 'Curl martillo', 'Hammer curl',
 'Como el curl de bíceps, pero con las palmas enfrentadas (agarre neutro) durante todo el movimiento.',
 'Like the biceps curl, but with palms facing each other (neutral grip) throughout the movement.'),
('barbell_curl', 'biceps', 'reps_weight', 3.5, NULL, 10, 3, 0.3, false,
 'Curl de bíceps con barra', 'Barbell curl',
 'Toma la barra con las palmas hacia arriba al ancho de hombros. Flexiona los codos llevando la barra al pecho y baja controlando.',
 'Grip the bar palms up at shoulder width. Bend your elbows to bring the bar to your chest and lower under control.'),
('chin_up', 'biceps', 'reps', 8.0, NULL, 6, 3, NULL, false,
 'Dominadas supinas', 'Chin-up',
 'Cuélgate de la barra con las palmas hacia ti. Sube hasta que el mentón pase la barra y baja por completo de forma controlada.',
 'Hang from the bar with palms facing you. Pull up until your chin clears the bar and lower all the way under control.'),
('concentration_curl', 'biceps', 'reps_weight', 3.0, NULL, 12, 3, 0.1, false,
 'Curl concentrado', 'Concentration curl',
 'Sentado en el banco, apoya el codo en la cara interna del muslo y sube la mancuerna hacia el hombro. Baja despacio y luego cambia de brazo.',
 'Seated on the bench, rest your elbow on your inner thigh and curl the dumbbell toward your shoulder. Lower slowly, then switch arms.'),

-- Tríceps
('bench_dip', 'triceps', 'reps', 3.8, NULL, 12, 3, NULL, false,
 'Fondos en banco', 'Bench dip',
 'Apoya las manos en el borde del banco, detrás de ti, con las piernas extendidas. Baja flexionando los codos hacia atrás y sube extendiéndolos.',
 'Place your hands on the edge of the bench behind you with legs extended. Lower by bending your elbows back and push back up.'),
('diamond_push_up', 'triceps', 'reps', 3.8, NULL, 10, 3, NULL, false,
 'Flexiones diamante', 'Diamond push-up',
 'En posición de flexión, junta las manos bajo el pecho formando un rombo con pulgares e índices. Baja manteniendo los codos pegados y sube.',
 'In a push-up position, bring your hands together under your chest forming a diamond with thumbs and index fingers. Lower keeping elbows close and push up.'),
('overhead_triceps_extension', 'triceps', 'reps_weight', 3.5, NULL, 12, 3, 0.12, false,
 'Extensión de tríceps sobre la cabeza', 'Overhead triceps extension',
 'Sostén una mancuerna con ambas manos sobre la cabeza. Baja la mancuerna detrás de la nuca flexionando los codos y vuelve a extender.',
 'Hold a dumbbell with both hands overhead. Lower it behind your head by bending your elbows and extend back up.'),
('dumbbell_skull_crusher', 'triceps', 'reps_weight', 3.5, NULL, 12, 3, 0.1, false,
 'Rompecráneos con mancuernas', 'Dumbbell skull crusher',
 'Acostado en el banco con los brazos extendidos hacia arriba, baja las mancuernas hacia la frente flexionando solo los codos y vuelve a extender.',
 'Lying on the bench with arms extended up, lower the dumbbells toward your forehead bending only your elbows, then extend back up.'),
('triceps_kickback', 'triceps', 'reps_weight', 3.0, NULL, 12, 3, 0.08, false,
 'Patada de tríceps', 'Triceps kickback',
 'Inclina el torso hacia adelante con el brazo pegado al cuerpo y el codo a 90°. Extiende el brazo hacia atrás y vuelve despacio.',
 'Lean your torso forward with your upper arm close to your body and elbow at 90°. Extend your arm back and return slowly.'),

-- Pecho
('push_up', 'chest', 'reps', 3.8, NULL, 12, 3, NULL, false,
 'Flexiones de brazos', 'Push-up',
 'Manos algo más abiertas que los hombros y el cuerpo recto. Baja el pecho hasta casi tocar el suelo y empuja hacia arriba. Puedes apoyar las rodillas para facilitarlo.',
 'Hands slightly wider than your shoulders and body straight. Lower your chest almost to the floor and push back up. You can rest on your knees to make it easier.'),
('incline_push_up', 'chest', 'reps', 3.5, NULL, 12, 3, NULL, false,
 'Flexiones inclinadas en banco', 'Incline push-up',
 'Apoya las manos en el borde del banco con el cuerpo recto. Baja el pecho hacia el banco y empuja. Es una versión más fácil de la flexión.',
 'Place your hands on the edge of the bench with your body straight. Lower your chest to the bench and push up. An easier push-up variation.'),
('dumbbell_bench_press', 'chest', 'reps_weight', 5.0, NULL, 12, 3, 0.25, false,
 'Press de pecho con mancuernas', 'Dumbbell bench press',
 'Acostado en el banco, baja las mancuernas a los lados del pecho y empújalas hacia arriba hasta extender los brazos.',
 'Lying on the bench, lower the dumbbells to the sides of your chest and press them up until your arms are extended.'),
('barbell_bench_press', 'chest', 'reps_weight', 6.0, NULL, 10, 3, 0.6, false,
 'Press de banca con barra', 'Barbell bench press',
 'Acostado en el banco, baja la barra controlando hasta rozar el pecho y empújala hacia arriba. Usa siempre a alguien que te asista con pesos altos.',
 'Lying on the bench, lower the bar under control to touch your chest and press it up. Always use a spotter with heavy loads.'),
('dumbbell_fly', 'chest', 'reps_weight', 3.5, NULL, 12, 3, 0.12, false,
 'Aperturas con mancuernas', 'Dumbbell fly',
 'Acostado en el banco con los brazos arriba y los codos apenas flexionados, abre los brazos hacia los lados hasta sentir el estiramiento y vuelve a cerrar.',
 'Lying on the bench with arms up and elbows slightly bent, open your arms out to the sides until you feel a stretch, then bring them back together.'),

-- Espalda
('pull_up', 'back', 'reps', 8.0, NULL, 6, 3, NULL, false,
 'Dominadas', 'Pull-up',
 'Cuélgate de la barra con las palmas hacia adelante, más abiertas que los hombros. Sube llevando el pecho hacia la barra y baja controlando.',
 'Hang from the bar with palms facing forward, wider than your shoulders. Pull your chest toward the bar and lower under control.'),
('one_arm_dumbbell_row', 'back', 'reps_weight', 5.0, NULL, 12, 3, 0.25, false,
 'Remo con mancuerna a una mano', 'One-arm dumbbell row',
 'Apoya una mano y una rodilla en el banco con la espalda recta. Tira la mancuerna hacia la cadera llevando el codo atrás y baja despacio.',
 'Rest one hand and one knee on the bench with a straight back. Pull the dumbbell toward your hip, driving the elbow back, and lower slowly.'),
('barbell_row', 'back', 'reps_weight', 5.0, NULL, 10, 3, 0.5, false,
 'Remo con barra', 'Barbell row',
 'Inclina el torso con la espalda recta y las rodillas apenas flexionadas. Tira la barra hacia el abdomen y bájala controlando.',
 'Hinge forward with a straight back and slightly bent knees. Pull the bar toward your stomach and lower it under control.'),
('superman', 'back', 'reps', 3.0, NULL, 12, 3, NULL, false,
 'Superman', 'Superman',
 'Boca abajo con los brazos extendidos al frente, eleva a la vez brazos, pecho y piernas unos centímetros. Sostén un segundo y baja.',
 'Face down with arms extended in front, lift your arms, chest and legs a few inches at the same time. Hold for a second and lower.'),
('barbell_deadlift', 'back', 'reps_weight', 6.0, NULL, 8, 4, 0.8, false,
 'Peso muerto con barra', 'Barbell deadlift',
 'Con la barra sobre los pies, flexiona cadera y rodillas y tómala con la espalda recta. Levántate extendiendo cadera y rodillas a la vez, con la barra pegada a las piernas.',
 'With the bar over your feet, bend at the hips and knees and grip it with a straight back. Stand up extending hips and knees together, keeping the bar close to your legs.'),

-- Abdomen
('crunch', 'abs', 'reps', 3.0, NULL, 20, 2, NULL, false,
 'Abdominales (crunch)', 'Crunch',
 'Acostado boca arriba con las rodillas flexionadas, despega los hombros del suelo contrayendo el abdomen. Baja sin relajar del todo.',
 'Lying on your back with knees bent, lift your shoulders off the floor by contracting your abs. Lower without fully relaxing.'),
('plank', 'abs', 'time', 3.5, 1, NULL, 3, NULL, false,
 'Plancha', 'Plank',
 'Apoya antebrazos y puntas de los pies con el cuerpo recto, el abdomen firme y la cadera alineada. Mantén la posición respirando con normalidad.',
 'Rest on your forearms and toes with your body straight, abs tight and hips aligned. Hold the position while breathing normally.'),
('bicycle_crunch', 'abs', 'reps', 3.5, NULL, 20, 2, NULL, false,
 'Abdominales bicicleta', 'Bicycle crunch',
 'Boca arriba con las manos junto a la cabeza, lleva un codo hacia la rodilla contraria mientras extiendes la otra pierna. Alterna como si pedalearas.',
 'On your back with hands by your head, bring one elbow toward the opposite knee while extending the other leg. Alternate as if pedaling.'),
('hanging_leg_raise', 'abs', 'reps', 4.0, NULL, 10, 3, NULL, false,
 'Elevación de piernas colgado', 'Hanging leg raise',
 'Colgado de la barra, eleva las piernas extendidas (o con las rodillas flexionadas) hasta la altura de la cadera sin balancearte. Baja despacio.',
 'Hanging from the bar, raise your straight legs (or bent knees) to hip height without swinging. Lower slowly.'),
('mountain_climber', 'abs', 'time', 8.0, 2, NULL, 3, NULL, true,
 'Escaladores', 'Mountain climbers',
 'En posición de plancha alta, lleva las rodillas hacia el pecho alternando rápido, con la cadera baja y el abdomen firme.',
 'In a high plank, drive your knees toward your chest alternating quickly, keeping your hips low and abs tight.'),

-- Hombros
('dumbbell_shoulder_press', 'shoulders', 'reps_weight', 5.0, NULL, 12, 3, 0.15, false,
 'Press de hombros con mancuernas', 'Dumbbell shoulder press',
 'Con las mancuernas a la altura de los hombros, empújalas hacia arriba hasta extender los brazos sin arquear la espalda. Baja controlando.',
 'With the dumbbells at shoulder height, press them overhead until your arms are extended without arching your back. Lower under control.'),
('lateral_raise', 'shoulders', 'reps_weight', 3.5, NULL, 12, 3, 0.07, false,
 'Elevaciones laterales', 'Lateral raise',
 'De pie con una mancuerna en cada mano, eleva los brazos hacia los costados hasta la altura de los hombros con los codos apenas flexionados. Baja despacio.',
 'Standing with a dumbbell in each hand, raise your arms out to the sides to shoulder height with elbows slightly bent. Lower slowly.'),
('barbell_overhead_press', 'shoulders', 'reps_weight', 5.0, NULL, 10, 3, 0.4, false,
 'Press militar con barra', 'Barbell overhead press',
 'De pie, con la barra a la altura de la clavícula, empújala sobre la cabeza hasta extender los brazos. Baja controlando sin arquear la espalda.',
 'Standing with the bar at collarbone height, press it overhead until your arms are extended. Lower under control without arching your back.'),
('pike_push_up', 'shoulders', 'reps', 3.8, NULL, 10, 3, NULL, false,
 'Flexiones en pica', 'Pike push-up',
 'Con la cadera alta formando una V invertida, flexiona los codos llevando la cabeza hacia el suelo entre las manos y empuja para volver.',
 'With your hips high in an inverted V, bend your elbows to bring your head toward the floor between your hands and push back up.'),
('front_raise', 'shoulders', 'reps_weight', 3.5, NULL, 12, 3, 0.07, false,
 'Elevaciones frontales', 'Front raise',
 'De pie con una mancuerna en cada mano, eleva los brazos al frente hasta la altura de los hombros y baja despacio.',
 'Standing with a dumbbell in each hand, raise your arms in front of you to shoulder height and lower slowly.'),

-- Generales (cardio y movilidad, sin equipamiento)
('jumping_jacks', 'general', 'time', 8.0, 3, NULL, 3, NULL, true,
 'Saltos de tijera', 'Jumping jacks',
 'Salta abriendo piernas y brazos por encima de la cabeza y vuelve a cerrar, a ritmo constante.',
 'Jump while spreading your legs and raising your arms overhead, then return, at a steady pace.'),
('marching_in_place', 'general', 'time', 3.5, 10, NULL, 3, NULL, false,
 'Marcha en el lugar', 'Marching in place',
 'Marcha en el lugar elevando las rodillas y balanceando los brazos. Ideal para entrar en calor o si recién empiezas.',
 'March in place lifting your knees and swinging your arms. Great for warming up or if you are just starting out.'),
('jogging_in_place', 'general', 'time', 7.0, 8, NULL, 3, NULL, true,
 'Trote en el lugar', 'Jogging in place',
 'Trota en el lugar apoyando la parte delantera del pie, con los brazos flexionados acompañando el movimiento.',
 'Jog in place landing on the balls of your feet, with bent arms moving along.'),
('burpees', 'general', 'reps', 8.0, NULL, 10, 4, NULL, true,
 'Burpees', 'Burpees',
 'Desde de pie, baja en cuclillas, apoya las manos y lleva los pies atrás a plancha. Vuelve a cuclillas y salta con los brazos arriba.',
 'From standing, squat down, place your hands on the floor and jump your feet back into a plank. Return to the squat and jump up with arms overhead.'),
('mobility_stretching', 'general', 'time', 2.5, 8, NULL, 3, NULL, false,
 'Movilidad y estiramiento', 'Mobility and stretching',
 'Estira brazos hacia arriba y luego inclínate hacia adelante llevando las manos hacia los pies. Respira lento y sin rebotes.',
 'Reach your arms up, then bend forward bringing your hands toward your feet. Breathe slowly and avoid bouncing.')
ON CONFLICT ("slug") DO UPDATE SET
    "muscle" = EXCLUDED."muscle",
    "measure" = EXCLUDED."measure",
    "met" = EXCLUDED."met",
    "baseMinutes" = EXCLUDED."baseMinutes",
    "baseReps" = EXCLUDED."baseReps",
    "secondsPerRep" = EXCLUDED."secondsPerRep",
    "loadFactor" = EXCLUDED."loadFactor",
    "highImpact" = EXCLUDED."highImpact",
    "nameEs" = EXCLUDED."nameEs",
    "nameEn" = EXCLUDED."nameEn",
    "instructionsEs" = EXCLUDED."instructionsEs",
    "instructionsEn" = EXCLUDED."instructionsEn";

-- Equipamiento requerido por ejercicio (los de peso corporal no tienen filas).
CREATE TEMP TABLE "_exercise_equipment_seed" ("exercise" TEXT NOT NULL, "equipment" TEXT NOT NULL);

INSERT INTO "_exercise_equipment_seed" ("exercise", "equipment") VALUES
('goblet_squat', 'dumbbells'),
('barbell_back_squat', 'barbell'),
('stationary_bike', 'stationary_bike'),
('hip_thrust', 'barbell'),
('hip_thrust', 'bench'),
('dumbbell_romanian_deadlift', 'dumbbells'),
('bench_step_up', 'bench'),
('dumbbell_curl', 'dumbbells'),
('hammer_curl', 'dumbbells'),
('barbell_curl', 'barbell'),
('chin_up', 'pull_up_bar'),
('concentration_curl', 'dumbbells'),
('concentration_curl', 'bench'),
('bench_dip', 'bench'),
('overhead_triceps_extension', 'dumbbells'),
('dumbbell_skull_crusher', 'dumbbells'),
('dumbbell_skull_crusher', 'bench'),
('triceps_kickback', 'dumbbells'),
('incline_push_up', 'bench'),
('dumbbell_bench_press', 'dumbbells'),
('dumbbell_bench_press', 'bench'),
('barbell_bench_press', 'barbell'),
('barbell_bench_press', 'bench'),
('dumbbell_fly', 'dumbbells'),
('dumbbell_fly', 'bench'),
('pull_up', 'pull_up_bar'),
('one_arm_dumbbell_row', 'dumbbells'),
('one_arm_dumbbell_row', 'bench'),
('barbell_row', 'barbell'),
('barbell_deadlift', 'barbell'),
('hanging_leg_raise', 'pull_up_bar'),
('dumbbell_shoulder_press', 'dumbbells'),
('lateral_raise', 'dumbbells'),
('barbell_overhead_press', 'barbell'),
('front_raise', 'dumbbells');

DO $$
DECLARE missing TEXT;
BEGIN
    SELECT string_agg(s."exercise" || ' / ' || s."equipment", ', ') INTO missing
    FROM "_exercise_equipment_seed" s
    LEFT JOIN "exercises" x ON x."slug" = s."exercise"
    LEFT JOIN "equipment" e ON e."slug" = s."equipment"
    WHERE x."id" IS NULL OR e."id" IS NULL;

    IF missing IS NOT NULL THEN
        RAISE EXCEPTION 'Equipamiento con ejercicio o equipo inexistente: %', missing;
    END IF;
END $$;

INSERT INTO "exercise_equipment" ("exerciseId", "equipmentId")
SELECT x."id", e."id"
FROM "_exercise_equipment_seed" s
JOIN "exercises" x ON x."slug" = s."exercise"
JOIN "equipment" e ON e."slug" = s."equipment"
ON CONFLICT DO NOTHING;

DROP TABLE "_exercise_equipment_seed";
