import jsPDF from 'jspdf';
import { Match } from '@/types';
import { formatDate } from '@/lib/utils';

export const exportMatchSheet = (match: Match): void => {
  const doc = new jsPDF();
  
  // Configuration
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = 30;
  
  // Titre
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FEUILLE DE MATCH - SNOOKER', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 20;
  
  // Informations générales
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  const generalInfo = [
    `Date: ${formatDate(match.createdAt)}`,
    `Lieu: ${match.venue || 'Non spécifié'}`,
    `Arbitre: ${match.referee || 'Non spécifié'}`,
    `Format: ${match.format.setsEnabled ? 
      `Best of ${match.format.bestOfSets} sets (${match.format.framesPerSet} frames/set)` : 
      `Best of ${match.format.bestOfSets} frames`}`,
    `Statut: ${match.status === 'completed' ? 'Terminé' : match.status}`
  ];
  
  generalInfo.forEach(info => {
    doc.text(info, margin, yPosition);
    yPosition += 7;
  });
  
  yPosition += 10;
  
  // Joueurs
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('JOUEURS', margin, yPosition);
  yPosition += 15;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  match.players.forEach((player, index) => {
    const playerInfo = `Joueur ${index + 1}: ${player.name}`;
    doc.text(playerInfo, margin, yPosition);
    yPosition += 7;
  });
  
  yPosition += 15;
  
  // Score final
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SCORE FINAL', margin, yPosition);
  yPosition += 15;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  
  if (match.status === 'completed') {
    const winner = match.players.find(p => p.playerId === match.score.match.winnerPlayerId);
    doc.text(`Vainqueur: ${winner?.name || 'Non déterminé'}`, margin, yPosition);
    yPosition += 10;
    
    if (match.format.setsEnabled) {
      doc.text(`Score en sets: ${match.score.match.p1Sets} - ${match.score.match.p2Sets}`, margin, yPosition);
      yPosition += 7;
    }
    
    const totalFrames1 = match.score.frames.filter(f => f.winnerPlayerId === match.players[0].playerId).length;
    const totalFrames2 = match.score.frames.filter(f => f.winnerPlayerId === match.players[1].playerId).length;
    doc.text(`Score en frames: ${totalFrames1} - ${totalFrames2}`, margin, yPosition);
    yPosition += 15;
  } else {
    doc.text('Match en cours ou abandonné', margin, yPosition);
    yPosition += 15;
  }
  
  // Détail des frames
  if (match.score.frames.length > 0) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('DÉTAIL DES FRAMES', margin, yPosition);
    yPosition += 15;
    
    // En-têtes du tableau
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    const headers = ['Set', 'Frame', match.players[0].name, match.players[1].name, 'Vainqueur', 'HB'];
    const colWidths = [25, 25, 35, 35, 40, 25];
    let xPos = margin;
    
    headers.forEach((header, index) => {
      doc.text(header, xPos, yPosition);
      xPos += colWidths[index];
    });
    
    yPosition += 10;
    doc.setFont('helvetica', 'normal');
    
    // Données des frames
    match.score.frames.forEach(frame => {
      if (yPosition > 250) { // Nouvelle page si nécessaire
        doc.addPage();
        yPosition = 30;
      }
      
      const winner = match.players.find(p => p.playerId === frame.winnerPlayerId);
      const data = [
        frame.setNo.toString(),
        frame.frameNo.toString(),
        frame.p1Points.toString(),
        frame.p2Points.toString(),
        winner ? winner.name.substring(0, 8) : '-',
        frame.highestBreak ? frame.highestBreak.toString() : '-'
      ];
      
      xPos = margin;
      data.forEach((cell, index) => {
        doc.text(cell, xPos, yPosition);
        xPos += colWidths[index];
      });
      
      yPosition += 7;
    });
  }
  
  // Historique des coups (sample)
  if (match.history.length > 0) {
    yPosition += 15;
    
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 30;
    }
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('HISTORIQUE (derniers coups)', margin, yPosition);
    yPosition += 15;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Afficher les 20 derniers coups
    const recentHistory = match.history.slice(-20);
    recentHistory.forEach(event => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
      
      const player = match.players.find(p => p.playerId === event.playerId);
      const eventText = `${player?.name || 'Unknown'}: ${event.action}${event.ball ? ` (${event.ball})` : ''} +${event.pointsDelta}`;
      doc.text(eventText, margin, yPosition);
      yPosition += 5;
    });
  }
  
  // Pied de page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Page ${i} sur ${pageCount} - Généré le ${formatDate(new Date())} - Snooker Scorer Pro`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Télécharger le PDF
  const fileName = `match-${match.players[0].name.replace(/\s+/g, '_')}-vs-${match.players[1].name.replace(/\s+/g, '_')}-${formatDate(match.createdAt).replace(/[\s:/]/g, '_')}.pdf`;
  doc.save(fileName);
};