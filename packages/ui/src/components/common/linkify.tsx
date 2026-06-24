import * as React from 'react';
import LinkifyIt from 'linkify-it';
import tlds from 'tlds';

// Instantiate and configure linkify instance once (module scope)
const linkify = new LinkifyIt();
linkify.tlds(tlds);

// Types
export type ComponentDecorator = (
    decoratedHref: string,
    decoratedText: string,
    key: React.Key
) => React.ReactNode;

export type HrefDecorator = (href: string) => string;
// Minimal shape of a match returned by linkify-it we rely upon
export interface LinkMatch {
    index: number;
    lastIndex: number;
    text: string;
    url: string;
    schema?: string;
    raw?: string;
    // Allow other optional fields without forcing an index signature
    [extra: string]: unknown | undefined;
}

export type MatchDecorator = (text: string) => LinkMatch[] | null | undefined;
export type TextDecorator = (text: string) => string;

export interface LinkifyProps {
    children: React.ReactNode;
    componentDecorator?: ComponentDecorator;
    hrefDecorator?: HrefDecorator;
    matchDecorator?: MatchDecorator;
    textDecorator?: TextDecorator;
}

// Default decorators
const defaultComponentDecorator: ComponentDecorator = (decoratedHref, decoratedText, key) => (
    <a
        className='text-blue-500 dark:text-blue-600 font-normal underline'
        href={decoratedHref}
        key={key}
        target="_blank"
        rel="noopener noreferrer"
    >
        {decoratedText}
    </a>
);

const defaultHrefDecorator: HrefDecorator = (href) => href;

const defaultMatchDecorator: MatchDecorator = (text) => (linkify.match(text) as LinkMatch[] | null) || [];

const defaultTextDecorator: TextDecorator = (text) => text;

// Component
const Linkify: React.FC<LinkifyProps> = ({
    children,
    componentDecorator = defaultComponentDecorator,
    hrefDecorator = defaultHrefDecorator,
    matchDecorator = defaultMatchDecorator,
    textDecorator = defaultTextDecorator,
}) => {
    // Parse a raw string into an array of nodes with link components
        const parseString = (value: string): React.ReactNode => {
        if (value === '') return value;

        const matches = matchDecorator(value);
        if (!matches || matches.length === 0) return value;

        const elements: React.ReactNode[] = [];
        let lastIndex = 0;
        matches.forEach((match, i) => {
            if (match.index > lastIndex) {
                elements.push(value.substring(lastIndex, match.index));
            }

            const decoratedHref = hrefDecorator(match.url);
            const decoratedText = textDecorator(match.text);
            elements.push(componentDecorator(decoratedHref, decoratedText, i));

            lastIndex = match.lastIndex;
        });

        if (value.length > lastIndex) {
            elements.push(value.substring(lastIndex));
        }

        return elements.length === 1 ? elements[0] : elements;
    };

    // Recursively traverse children converting strings
        const parse = (node: React.ReactNode, key = 0): React.ReactNode => {
        if (typeof node === 'string') {
            return parseString(node);
        }
        if (Array.isArray(node)) {
            return node.map((child, i) => parse(child, i));
        }
            if (React.isValidElement(node)) {
            // Skip anchors and buttons to avoid nesting links / altering interactive elements
                if (node.type === 'a' || node.type === 'button') return node;
                // Recurse into this element's children (props typed as any to avoid over-constraint)
                const element = node as React.ReactElement<{ children?: React.ReactNode }>;
                const childNodes = element.props?.children;
                return React.cloneElement(element, { key }, parse(childNodes));
        }
        return node;
    };

    return <>{parse(children)}</>;
};

export default Linkify;
