import React from 'react';
import { render, screen, cleanup } from '@testing-library/react-native';
import { ThemedText } from '../ThemedText';

describe('ThemedText', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders correctly with default props', () => {
    render(<ThemedText>Test text</ThemedText>);
    
    expect(screen.getByText('Test text')).toBeTruthy();
  });

  it('renders with title type correctly', () => {
    render(<ThemedText type="title">Title text</ThemedText>);
    
    const titleElement = screen.getByText('Title text');
    expect(titleElement).toBeTruthy();
  });

  it('renders with subtitle type correctly', () => {
    render(<ThemedText type="subtitle">Subtitle text</ThemedText>);
    
    const subtitleElement = screen.getByText('Subtitle text');
    expect(subtitleElement).toBeTruthy();
  });

  it('renders with link type correctly', () => {
    render(<ThemedText type="link">Link text</ThemedText>);
    
    const linkElement = screen.getByText('Link text');
    expect(linkElement).toBeTruthy();
  });

  it('handles custom light and dark colors', () => {
    render(
      <ThemedText lightColor="#FF0000" darkColor="#00FF00">
        Custom color text
      </ThemedText>
    );
    
    const customElement = screen.getByText('Custom color text');
    expect(customElement).toBeTruthy();
  });

  it('renders children correctly', () => {
    render(
      <ThemedText>
        <ThemedText type="subtitle">Nested text</ThemedText>
      </ThemedText>
    );
    
    expect(screen.getByText('Nested text')).toBeTruthy();
  });
});