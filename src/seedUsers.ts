import type { User } from './types.js';

export const SEED_PROFILES_WITH_DISTANCES: User[] = [
  // --- 0 to 10 km (CABA / Zona Centro) ---
  {
    id: 'user-valeria',
    name: 'Valeria Rivas',
    email: 'valeria@ejemplo.com',
    age: 24,
    gender: 'female',
    bio: 'Diseñadora UX/UI 🎨. Amante del café filtrado, museos de arte contemporáneo y pasear a mi perrito Milo 🐶.',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Palermo, CABA',
    distanceKm: 3,
    occupation: 'Diseñadora de Producto',
    interests: ['Diseño', 'Fotografía', 'Música Indie', 'Yoga', 'Viajes'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 89,
    matchesCount: 14,
    preferences: {
      minAge: 20,
      maxAge: 35,
      interestedIn: ['male', 'female', 'non-binary'],
      maxDistanceKm: 1000
    }
  },
  {
    id: 'user-mateo',
    name: 'Mateo Fernández',
    email: 'mateo@ejemplo.com',
    age: 29,
    gender: 'male',
    bio: 'Fotógrafo documental & viajero empedernido 📸. 28 países y contando. Charlas profundas y escapadas improvisadas.',
    photos: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'San Telmo, CABA',
    distanceKm: 4,
    occupation: 'Fotógrafo Profesional',
    interests: ['Fotografía', 'Viajes', 'Aventuras', 'Vinilos', 'Cerveza Artesanal'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 94,
    matchesCount: 18,
    preferences: {
      minAge: 22,
      maxAge: 35,
      interestedIn: ['female', 'non-binary'],
      maxDistanceKm: 1000
    }
  },
  {
    id: 'user-elena',
    name: 'Elena Gómez',
    email: 'elena@ejemplo.com',
    age: 25,
    gender: 'female',
    bio: 'Bailarina contemporánea e instructora de Pilates 🩰🌿. En busca de buenas energías, risas espontáneas y conexión genuina.',
    photos: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Colegiales, CABA',
    distanceKm: 4,
    occupation: 'Instructora de Danza',
    interests: ['Danza', 'Pilates', 'Naturaleza', 'Plantas', 'Cocina Saludable'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 132,
    matchesCount: 26,
    preferences: {
      minAge: 22,
      maxAge: 35,
      interestedIn: ['male', 'female'],
      maxDistanceKm: 1000
    }
  },
  {
    id: 'user-lucas',
    name: 'Lucas Martínez',
    email: 'lucas@ejemplo.com',
    age: 27,
    gender: 'male',
    bio: 'Ingeniero de software & escalador en roca 🧗. Apasionado por la cocina italiana casera 🍝 y tocar la guitarra.',
    photos: [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Recoleta, CABA',
    distanceKm: 5,
    occupation: 'Backend Developer',
    interests: ['Trekking', 'Guitarra', 'Cocina', 'Series', 'Startups'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 65,
    matchesCount: 9,
    preferences: {
      minAge: 21,
      maxAge: 32,
      interestedIn: ['female'],
      maxDistanceKm: 1000
    }
  },
  {
    id: 'user-sofia',
    name: 'Sofía Benítez',
    email: 'sofia@ejemplo.com',
    age: 23,
    gender: 'female',
    bio: 'Estudiante de Medicina & maratonista aficionada 🏃‍♀️🩺. Si sobreviví a anatomía, puedo sobrevivir a una primera cita divertida.',
    photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Caballito, CABA',
    distanceKm: 6,
    occupation: 'Estudiante de Medicina',
    interests: ['Running', 'Medicina', 'Podcasts', 'Playa', 'Perros'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 154,
    matchesCount: 31,
    preferences: {
      minAge: 22,
      maxAge: 32,
      interestedIn: ['male', 'female'],
      maxDistanceKm: 1000
    }
  },
  {
    id: 'user-camila',
    name: 'Camila Rossi',
    email: 'camila@ejemplo.com',
    age: 26,
    gender: 'female',
    bio: 'Arquitecta de día, exploradora gastronómica de noche 🍷✨. Busco a alguien para probar nuevos restaurantes.',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Belgrano, CABA',
    distanceKm: 7,
    occupation: 'Arquitecta',
    interests: ['Arquitectura', 'Vino Tinto', 'Cine', 'Libros', 'Gimnasio'],
    verified: false,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 110,
    matchesCount: 22,
    preferences: {
      minAge: 23,
      maxAge: 35,
      interestedIn: ['male', 'female'],
      maxDistanceKm: 1000
    }
  },
  {
    id: 'user-ignacio',
    name: 'Ignacio Silva',
    email: 'ignacio@ejemplo.com',
    age: 31,
    gender: 'male',
    bio: 'Sommelier y DJ de vinilos en mis tiempos libres 🎧🍇. Fanático del jazz, los atardeceres y las charlas largas.',
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Nuñez, CABA',
    distanceKm: 8,
    occupation: 'Sommelier & Gestor Cultural',
    interests: ['Música', 'Vinos', 'Gastronomía', 'Arte', 'Lectura'],
    verified: false,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 18).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 78,
    matchesCount: 12,
    preferences: {
      minAge: 25,
      maxAge: 38,
      interestedIn: ['female', 'other'],
      maxDistanceKm: 1000
    }
  },

  // --- 10 to 50 km (Gran Buenos Aires / Zona Norte y Sur) ---
  {
    id: 'user-alex',
    name: 'Alex Romero',
    email: 'alex.romero@ejemplo.com',
    age: 25,
    gender: 'non-binary',
    bio: 'Artista visual, animación digital y sintetizadores modulares 🎛️🌈. Busco personas auténticas con intereses curiosos.',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Vicente López, Buenos Aires',
    distanceKm: 14,
    occupation: 'Artista Audiovisual & TDAH',
    interests: ['Animación', 'Sintetizadores', 'Cine Experimental', 'Café', 'Arte Digital'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 9).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 104,
    matchesCount: 17,
    preferences: {
      minAge: 20,
      maxAge: 36,
      interestedIn: ['female', 'male', 'non-binary', 'other'],
      maxDistanceKm: 1000
    }
  },
  {
    id: 'user-lucia',
    name: 'Lucía Morales',
    email: 'lucia.morales@ejemplo.com',
    age: 27,
    gender: 'female',
    bio: 'Diseñadora botánica & amante de los jardines escondidos 🌿🌸. Coleccionista de vinilos y fan de los picnics junto al río.',
    photos: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'San Isidro, GBA Norte',
    distanceKm: 18,
    occupation: 'Diseñadora Paisajista',
    interests: ['Botánica', 'Paseos en Bici', 'Lectura', 'Té Matcha', 'Naturaleza'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 121,
    matchesCount: 23,
    preferences: {
      minAge: 24,
      maxAge: 35,
      interestedIn: ['male', 'female'],
      maxDistanceKm: 1000
    }
  },
  {
    id: 'user-nicolas',
    name: 'Nicolás Vega',
    email: 'nicolas.vega@ejemplo.com',
    age: 28,
    gender: 'male',
    bio: 'Kayak en el delta los sábados y desarrollador de software los días de semana 🛶💻. Siempre listo para acampar en una isla.',
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Tigre, GBA Norte',
    distanceKm: 24,
    occupation: 'Fullstack Dev & Kayakista',
    interests: ['Kayak', 'Río', 'Camping', 'Tecnología', 'Asados'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 88,
    matchesCount: 15,
    preferences: {
      minAge: 22,
      maxAge: 33,
      interestedIn: ['female'],
      maxDistanceKm: 1000
    }
  },
  {
    id: 'user-romina',
    name: 'Romina Juárez',
    email: 'romina.juarez@ejemplo.com',
    age: 26,
    gender: 'female',
    bio: 'Psicóloga con foco en neurodiversidad 🧠☕. Fascinada por las charlas profundas sin rodeos y el cine de autor.',
    photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Quilmes, GBA Sur',
    distanceKm: 32,
    occupation: 'Psicóloga Cognitiva',
    interests: ['Neurociencia', 'Cine', 'Literatura', 'Café', 'Gatos'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 11).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 97,
    matchesCount: 19,
    preferences: {
      minAge: 24,
      maxAge: 36,
      interestedIn: ['male', 'female'],
      maxDistanceKm: 1000
    }
  },
  {
    id: 'user-diego',
    name: 'Diego Albornoz',
    email: 'diego.albornoz@ejemplo.com',
    age: 30,
    gender: 'male',
    bio: 'Veterinario rural y apasionado por los caballos 🐎🌾. Mate dulce, fogones bajo las estrellas y tranquilidad campestre.',
    photos: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Pilar, Buenos Aires',
    distanceKm: 48,
    occupation: 'Médico Veterinario',
    interests: ['Animales', 'Campo', 'Guitarra', 'Fogones', 'Trekking'],
    verified: false,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 16).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 62,
    matchesCount: 11,
    preferences: {
      minAge: 23,
      maxAge: 35,
      interestedIn: ['female'],
      maxDistanceKm: 1000
    }
  },

  // --- 50 to 150 km (La Plata, Zárate, Campana, Areco) ---
  {
    id: 'user-martina',
    name: 'Martina Ferreyra',
    email: 'martina.ferreyra@ejemplo.com',
    age: 25,
    gender: 'female',
    bio: 'Bióloga molecular e investigadora 🧬🧪. Amante de los árboles de La Plata, las ferias de libros usados y la música acústica.',
    photos: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'La Plata, Buenos Aires',
    distanceKm: 56,
    occupation: 'Bióloga Molecular & AACC',
    interests: ['Ciencia', 'Divulgación', 'Museos', 'Series', 'Libros'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 140,
    matchesCount: 29,
    preferences: {
      minAge: 22,
      maxAge: 34,
      interestedIn: ['male', 'female'],
      maxDistanceKm: 1000
    }
  },
  {
    id: 'user-tomas',
    name: 'Tomás Navarro',
    email: 'tomas.navarro@ejemplo.com',
    age: 26,
    gender: 'male',
    bio: 'Diseño industrial y modelado 3D 🚲📐. Recorro las diagonales platenses en bicicleta y me encanta cocinar pizzas caseras.',
    photos: [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'La Plata, Buenos Aires',
    distanceKm: 60,
    occupation: 'Diseñador Industrial',
    interests: ['Bicicleta', 'Impresión 3D', 'Cocina', 'Música', 'Ciclismo'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 13).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 75,
    matchesCount: 14,
    preferences: {
      minAge: 21,
      maxAge: 32,
      interestedIn: ['female', 'non-binary'],
      maxDistanceKm: 1000
    }
  },
  {
    id: 'user-carolina',
    name: 'Carolina Méndez',
    email: 'carolina.mendez@ejemplo.com',
    age: 28,
    gender: 'female',
    bio: 'Ingeniera ambiental trabajando por humedales limpios 🌾💧. Yoga al amanecer y paseos con binoculares para observar aves.',
    photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Campana / Zárate, Buenos Aires',
    distanceKm: 88,
    occupation: 'Ingeniera Ambiental',
    interests: ['Ecología', 'Humedales', 'Aves', 'Yoga', 'Senderismo'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 115,
    matchesCount: 21,
    preferences: {
      minAge: 25,
      maxAge: 38,
      interestedIn: ['male', 'female'],
      maxDistanceKm: 1000
    }
  },
  {
    id: 'user-santiago',
    name: 'Santiago Brizuela',
    email: 'santiago.brizuela@ejemplo.com',
    age: 29,
    gender: 'male',
    bio: 'Platero criollo y restaurador de antigüedades 🔨✨. Fan de la vida pausada de pueblo, la literatura histórica y el buen café.',
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'San Antonio de Areco, Buenos Aires',
    distanceKm: 115,
    occupation: 'Orfebre & Artesano',
    interests: ['Artesanía', 'Historia', 'Café', 'Antigüedades', 'Música Folclórica'],
    verified: false,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 22).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 54,
    matchesCount: 8,
    preferences: {
      minAge: 23,
      maxAge: 35,
      interestedIn: ['female'],
      maxDistanceKm: 1000
    }
  },

  // --- 250 to 500 km (Rosario, Tandil, Mar del Plata) ---
  {
    id: 'user-julieta',
    name: 'Julieta Soria',
    email: 'julieta.soria@ejemplo.com',
    age: 28,
    gender: 'female',
    bio: 'Arquitecta de espacios sensoriales & amante del río Paraná 🌊🎨. Atardeceres en el Parque España con tereré o mate.',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Rosario, Santa Fe',
    distanceKm: 298,
    occupation: 'Arquitecta Sensorial',
    interests: ['Río Paraná', 'Arquitectura', 'Diseño', 'Pintura', 'Teatro'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 168,
    matchesCount: 34,
    preferences: {
      minAge: 24,
      maxAge: 38,
      interestedIn: ['male', 'female'],
      maxDistanceKm: 1000
    }
  },
  {
    id: 'user-facundo',
    name: 'Facundo Castro',
    email: 'facundo.castro@ejemplo.com',
    age: 30,
    gender: 'male',
    bio: 'Músico, pianista de jazz y productor de audio 🎹🎧. Disfruto de cocinar platos elaborados y de conversaciones sin prisas.',
    photos: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Rosario, Santa Fe',
    distanceKm: 305,
    occupation: 'Productor Musical & Pianista',
    interests: ['Jazz', 'Piano', 'Producción', 'Gastronomía', 'Vinos'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 17).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 92,
    matchesCount: 16,
    preferences: {
      minAge: 24,
      maxAge: 36,
      interestedIn: ['female'],
      maxDistanceKm: 1000
    }
  },
  {
    id: 'user-micaela',
    name: 'Micaela Ramos',
    email: 'micaela.ramos@ejemplo.com',
    age: 29,
    gender: 'female',
    bio: 'Bióloga marina y surfista en Chapadmalal 🏄‍♀️🌊. Los días de tormenta me encuentran leyendo con té caliente frente al mar.',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Mar del Plata, Buenos Aires',
    distanceKm: 410,
    occupation: 'Bióloga Marina & Surfista',
    interests: ['Surf', 'Océano', 'Atardeceres', 'Cerveza Artesanal', 'Medio Ambiente'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 182,
    matchesCount: 38,
    preferences: {
      minAge: 25,
      maxAge: 38,
      interestedIn: ['male', 'female'],
      maxDistanceKm: 1000
    }
  },

  // --- 600 to 1500 km (Córdoba, Mendoza, Bariloche, Salta) ---
  {
    id: 'user-valentina',
    name: 'Valentina Díaz',
    email: 'valentina.diaz@ejemplo.com',
    age: 24,
    gender: 'female',
    bio: 'Desarrolladora frontend & apasionada por las sierras cordobesas ⛰️💻. Fin de semanas de trekking y noches de fogón y risas.',
    photos: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Córdoba Capital',
    distanceKm: 695,
    occupation: 'Desarrolladora Web & TDAH',
    interests: ['Sierras', 'Trekking', 'Startups', 'Rock Nacional', 'Río'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 195,
    matchesCount: 42,
    preferences: {
      minAge: 21,
      maxAge: 33,
      interestedIn: ['male', 'female'],
      maxDistanceKm: 1500
    }
  },
  {
    id: 'user-joaquin',
    name: 'Joaquín Herrera',
    email: 'joaquin.herrera@ejemplo.com',
    age: 27,
    gender: 'male',
    bio: 'Cocinero de montaña & escalador deportivo 🧗🍲. Fanático de las especias, los refugios de montaña y la tranquilidad serrana.',
    photos: [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Córdoba Capital',
    distanceKm: 700,
    occupation: 'Chef de Montaña',
    interests: ['Escalada', 'Gastronomía', 'Naturaleza', 'Camping', 'Acústico'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 19).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 86,
    matchesCount: 17,
    preferences: {
      minAge: 22,
      maxAge: 34,
      interestedIn: ['female'],
      maxDistanceKm: 1500
    }
  },
  {
    id: 'user-agustina',
    name: 'Agustina Paz',
    email: 'agustina.paz@ejemplo.com',
    age: 26,
    gender: 'female',
    bio: 'Sommelier de altura y enóloga al pie de los Andes 🍇🏔️. Noches estrelladas, copas de Malbec y charlas profundas sobre la vida.',
    photos: [
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Mendoza Capital',
    distanceKm: 985,
    occupation: 'Sommelier de Altura',
    interests: ['Vinos', 'Cordillera', 'Aconcagua', 'Fotografía', 'Arte'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 165,
    matchesCount: 32,
    preferences: {
      minAge: 24,
      maxAge: 38,
      interestedIn: ['male', 'female'],
      maxDistanceKm: 1500
    }
  },
  {
    id: 'user-sol',
    name: 'Sol Roldán',
    email: 'sol.roldan@ejemplo.com',
    age: 25,
    gender: 'female',
    bio: 'Guía de montaña & fotógrafa de paisajes patagónicos 🌲❄️. Lagos glaciares, fogones calientes y chocolates artesanales.',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'San Carlos de Bariloche, Río Negro',
    distanceKm: 1350,
    occupation: 'Guía de Alta Montaña',
    interests: ['Snowboard', 'Lagos', 'Trekking', 'Fotografía', 'Naturaleza'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 210,
    matchesCount: 45,
    preferences: {
      minAge: 22,
      maxAge: 35,
      interestedIn: ['male', 'female', 'non-binary'],
      maxDistanceKm: 2000
    }
  },
  {
    id: 'user-kevin',
    name: 'Kevin Argañaraz',
    email: 'kevin.arganaraz@ejemplo.com',
    age: 28,
    gender: 'male',
    bio: 'Geólogo explorador en las quebradas del norte argentino 🏜️🧭. Amante de la historia andina, peñas folclóricas y café de altura.',
    photos: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80'
    ],
    location: 'Salta Capital',
    distanceKm: 1480,
    occupation: 'Geólogo de Campo',
    interests: ['Quebradas', 'Geología', 'Folklore', 'Café', 'Viajes'],
    verified: true,
    emailVerified: true,
    status: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    lastActive: new Date().toISOString(),
    likesCount: 71,
    matchesCount: 13,
    preferences: {
      minAge: 23,
      maxAge: 35,
      interestedIn: ['female'],
      maxDistanceKm: 2000
    }
  }
];
