const fs = require('fs');
const assetCardPath = './src/components/shared/AssetCard.tsx';
const resultCardPath = './src/components/ceiling/ResultCard.tsx';

let assetCard = fs.readFileSync(assetCardPath, 'utf8');
let resultCard = fs.readFileSync(resultCardPath, 'utf8');

const importsToAdd = `
import { Bell, Share2 } from 'lucide-react';
import { CardHeader, CardContent } from '@/components/ui/card';
import type { Asset } from '@/lib/domain';
import { ceilingPrice, isUsAsset, netAfterTax, safetyMargin } from '@/lib/calculations';
import { buildResultShareText, computeAvgDividend, formatResultDate, type Timeframe } from '@/lib/resultCard';
import { AddToWatchlistDialog } from '../ceiling/AddToWatchlistDialog';
import { IndicatorGrid } from '../ceiling/IndicatorGrid';
import { GoalPlanner } from '../ceiling/GoalPlanner';
import { DividendHistoryChart } from '../ceiling/result/DividendHistoryChart';
import { ResultStats } from '../ceiling/result/ResultStats';
import { useSubscription } from '@/lib/subscription';
import { PaywallDialog } from '../ui/PaywallDialog';
import { useState, useMemo } from 'react';
`;

resultCard = resultCard.replace('export function ResultCard(', 'function SearchVariant(');
resultCard = resultCard.replace(/import .* from .*/g, '');

assetCard = assetCard.replace('export interface AssetCardProps {', `export interface AssetCardProps {\n  asset?: Asset;\n  targetYield?: number;\n  averagePrice?: number | null;\n  hideAddToWatchlist?: boolean;\n`);

assetCard = assetCard.replace(
  'function AssetCardImpl(props: AssetCardProps) {', 
  `function AssetCardImpl(props: AssetCardProps) {
  if (props.variant === 'search' && props.asset && props.targetYield !== undefined) {
    return <SearchVariant asset={props.asset} targetYield={props.targetYield} averagePrice={props.averagePrice} hideAddToWatchlist={props.hideAddToWatchlist} />;
  }
`
);

fs.writeFileSync(assetCardPath, importsToAdd + '\n' + assetCard + '\n' + resultCard);
