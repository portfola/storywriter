export interface DialogueTurn {
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
}

const FILLER_WORDS = [
  'um', 'uh', 'er', 'ah', 'like', 'you know', 'i mean', 'well',
  'so', 'actually', 'basically', 'literally', 'totally', 'really',
  'kind of', 'sort of', 'i guess', 'you see', 'right'
];

const REPEATED_PHRASES = [
  /\b(\w+)\s+\1\b/gi, // Repeated words like "the the"
  /\b(\w+\s+\w+)\s+\1\b/gi // Repeated phrases like "you know you know"
];

export class TranscriptNormalizer {
  static normalizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    let normalized = text.trim();

    // Remove excessive whitespace
    normalized = normalized.replace(/\s+/g, ' ');

    // Remove filler words (case insensitive)
    const fillerPattern = new RegExp(`\\b(${FILLER_WORDS.join('|')})\\b`, 'gi');
    normalized = normalized.replace(fillerPattern, '');

    // Remove repeated words and phrases
    for (const pattern of REPEATED_PHRASES) {
      normalized = normalized.replace(pattern, '$1');
    }

    // Fix common transcription errors
    normalized = this.fixCommonErrors(normalized);

    // Clean up punctuation and spacing
    normalized = this.cleanupPunctuation(normalized);

    // Capitalize sentences
    normalized = this.capitalizeSentences(normalized);

    return normalized.replace(/\s+/g, ' ').trim();
  }

  private static fixCommonErrors(text: string): string {
    let result = text;

    // Common speech-to-text errors
    const simpleCorrections: { [key: string]: string } = {
      ' i ': ' I ',
      " i'": " I'",
      ' wanna ': ' want to ',
      ' gonna ': ' going to ',
      ' gotta ': ' got to ',
      ' kinda ': ' kind of ',
      ' sorta ': ' sort of ',
      " can't ": " cannot ",
      " won't ": " will not ",
      " n't ": "n't "
    };

    // Apply simple string replacements
    for (const [pattern, replacement] of Object.entries(simpleCorrections)) {
      result = result.replace(new RegExp(pattern, 'gi'), replacement);
    }

    // Fix 'I' at start and end of sentences
    result = result.replace(/\bi\b/g, 'I');
    result = result.replace(/^i\s/gi, 'I ');
    result = result.replace(/\si$/gi, ' I');

    // Remove false starts (word + "no" + word pattern)
    result = result.replace(/\b\w+\s+no\s+(\w+)/gi, '$1');

    return result;
  }

  private static cleanupPunctuation(text: string): string {
    let result = text;

    // Remove multiple consecutive punctuation marks
    result = result.replace(/[.]{2,}/g, '.');
    result = result.replace(/[!]{2,}/g, '!');
    result = result.replace(/[?]{2,}/g, '?');
    result = result.replace(/[,]{2,}/g, ',');

    // Ensure proper spacing after punctuation
    result = result.replace(/([.!?])\s*([a-zA-Z])/g, '$1 $2');
    result = result.replace(/([,])\s*([a-zA-Z])/g, '$1 $2');

    // Remove spaces before punctuation
    result = result.replace(/\s+([.!?,:;])/g, '$1');

    return result;
  }

  private static capitalizeSentences(text: string): string {
    return text.replace(/(^|\.\s+)([a-z])/g, (match, prefix, letter) => {
      return prefix + letter.toUpperCase();
    });
  }

  static processDialogue(dialogueTurns: DialogueTurn[]): DialogueTurn[] {
    return dialogueTurns.map(turn => ({
      ...turn,
      content: this.normalizeText(turn.content)
    })).filter(turn => turn.content.length > 0);
  }

  static generateTranscript(dialogueTurns: DialogueTurn[]): string {
    const normalizedTurns = this.processDialogue(dialogueTurns);
    
    return normalizedTurns
      .map(turn => {
        const roleLabel = turn.role === 'user' ? 'User' : 'Agent';
        return `${roleLabel}: ${turn.content}`;
      })
      .join('\n\n');
  }

  static extractUserContent(dialogueTurns: DialogueTurn[]): string {
    return dialogueTurns
      .filter(turn => turn.role === 'user')
      .map(turn => this.normalizeText(turn.content))
      .filter(content => content.length > 0)
      .join(' ');
  }

  static extractAgentContent(dialogueTurns: DialogueTurn[]): string {
    return dialogueTurns
      .filter(turn => turn.role === 'agent')
      .map(turn => this.normalizeText(turn.content))
      .filter(content => content.length > 0)
      .join(' ');
  }
}