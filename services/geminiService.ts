
export const generateRoomTheme = async (roomName: string): Promise<string> => {
  const themes = [
    "Fiesta Navideña", 
    "Intercambio Mágico", 
    "Sorpresas de Invierno", 
    "Alegría Compartida", 
    "Secretos Festivos",
    "Luces y Regalos",
    "Espíritu Navideño"
  ];
  // Simulate a short delay for UX consistency
  await new Promise(resolve => setTimeout(resolve, 500));
  return themes[Math.floor(Math.random() * themes.length)];
};

export const generateRevealMessage = async (
  giverName: string, 
  receiverName: string, 
  theme: string
): Promise<string> => {
  const templates = [
    `¡La suerte está echada!\nTe ha tocado regalar a ${receiverName}.`,
    `¡Prepárate para la misión!\nTu amigo invisible es ${receiverName}.`,
    `¡Guarda el secreto!\nLe regalarás a ${receiverName}.`,
    `¡Sorpresa festiva!\n${receiverName} espera tu regalo.`,
    `Bajo el árbol habrá un paquete,\npara ${receiverName}, ¡no es un juguete!`
  ];
  
  await new Promise(resolve => setTimeout(resolve, 300));
  return templates[Math.floor(Math.random() * templates.length)];
};
