'use client';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import { DiagnosticResult, DISEASE_MAP, GENERAL_DOCTOR_QUESTIONS } from '../types';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1E293B',
  },
  // Top Prominent Medical Notice Banner
  topDisclaimerBox: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 6,
    padding: 9,
    marginBottom: 14,
  },
  topDisclaimerTitle: {
    color: '#9F1239',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  topDisclaimerText: {
    color: '#881337',
    fontSize: 8,
    lineHeight: 1.35,
  },
  // Header Section
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 10,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1D4ED8',
  },
  brandSubtitle: {
    fontSize: 8,
    color: '#64748B',
    marginTop: 2,
  },
  reportMetaRight: {
    alignItems: 'flex-end',
  },
  reportHeading: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  reportMetaText: {
    fontSize: 8,
    color: '#64748B',
    marginTop: 1.5,
  },
  // Section Box
  sectionCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 3,
    textTransform: 'uppercase',
  },
  // Scan Overview 2-Column Layout
  scanOverviewRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scanImageContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  scanImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  scanDetailsCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  predictionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  urgencyBadge: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  urgencyHigh: {
    backgroundColor: '#FFE4E6',
    color: '#9F1239',
  },
  urgencyModerate: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  urgencyRoutine: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  predictionName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  clinicalClassification: {
    fontSize: 8.5,
    color: '#475569',
    marginBottom: 4,
  },
  confidenceLine: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  nextStepText: {
    fontSize: 8,
    color: '#334155',
    lineHeight: 1.3,
  },
  // Confidence Breakdown
  breakdownContainer: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
  breakdownTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#92400E',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  breakdownExpl: {
    fontSize: 7.5,
    color: '#78350F',
    lineHeight: 1.3,
    marginBottom: 5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 1.5,
    fontSize: 8,
  },
  breakdownLabel: {
    color: '#451A03',
  },
  breakdownVal: {
    fontFamily: 'Helvetica-Bold',
    color: '#1E293B',
  },
  breakdownTip: {
    fontSize: 7,
    color: '#92400E',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
    paddingTop: 3,
  },
  // Patient Questionnaire
  contextGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contextItem: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    padding: 5,
  },
  contextItemLabel: {
    fontSize: 7,
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  contextItemVal: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  // Doctor Questions
  questionList: {
    gap: 3,
  },
  questionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    fontSize: 8,
    color: '#334155',
    lineHeight: 1.3,
  },
  questionBullet: {
    color: '#2563EB',
    fontFamily: 'Helvetica-Bold',
  },
  // Footer
  footerContainer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: '#94A3B8',
  },
});

interface AnalysisReportDocumentProps {
  result: DiagnosticResult;
  localImageSrc?: string;
}

export const AnalysisReportDocument: React.FC<AnalysisReportDocumentProps> = ({
  result,
  localImageSrc,
}) => {
  const diseaseKey = result.prediction.toLowerCase();
  const diseaseInfo = DISEASE_MAP[diseaseKey] || {
    code: diseaseKey,
    friendlyName: result.prediction,
    clinicalName: result.prediction,
    urgency: 'routine',
    type: 'benign',
    categoryBadge: 'Detected Spot',
    whatIsIt: 'Automated AI pattern match for this skin group.',
    recommendedNextStep: 'Mention it at your next regular checkup if you have any questions.',
    detailedOverview: '',
    visualCharacteristics: [],
    riskFactors: [],
    clinicalImportance: '',
  };

  const confidencePercent = Math.round(result.confidence_score * 100);
  const isLowConfidence = confidencePercent < 70;
  const isHighUrgency = diseaseInfo.urgency === 'high';
  const isModerateUrgency = diseaseInfo.urgency === 'moderate';

  // Calculate Top-3 Matches if low-confidence
  let topMatchName = diseaseInfo.friendlyName;
  let secondMatchName = '';
  let top1Pct = confidencePercent;
  let top2Pct = 0;
  let otherRemainderPct = 0;

  if (result.probabilities) {
    const sorted = Object.entries(result.probabilities).sort((a, b) => b[1] - a[1]);
    if (sorted[0]) {
      const d1 = DISEASE_MAP[sorted[0][0].toLowerCase()];
      topMatchName = d1 ? d1.friendlyName : sorted[0][0];
      top1Pct = Math.round(sorted[0][1] * 100);
    }
    if (sorted[1]) {
      const d2 = DISEASE_MAP[sorted[1][0].toLowerCase()];
      secondMatchName = d2 ? d2.friendlyName : sorted[1][0];
      top2Pct = Math.round(sorted[1][1] * 100);
    }
    otherRemainderPct = Math.max(0, 100 - top1Pct - top2Pct);
  }

  const formattedDate = new Date(result.created_at || Date.now()).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const ctx = result.symptom_context;

  return (
    <Document title={`DermAI_Report_Scan_${result.id || 'Current'}.pdf`}>
      <Page size="A4" style={styles.page}>
        {/* 1. Top-of-page Prominent Medical Disclaimer */}
        <View style={styles.topDisclaimerBox}>
          <Text style={styles.topDisclaimerTitle}>
            Clinical Screening Notice &mdash; Not an Official Medical Diagnosis
          </Text>
          <Text style={styles.topDisclaimerText}>
            This is an AI-generated screening result, not a medical diagnosis. It has not been reviewed by a clinician.
            DermAI is an image pattern evaluation assistant intended to encourage early evaluation. Please share this document
            with a licensed dermatologist or primary care doctor for definitive physical examination, dermoscopy, or biopsy.
          </Text>
        </View>

        {/* 2. Report Header */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.brandTitle}>DermAI</Text>
            <Text style={styles.brandSubtitle}>Multi-Class Skin &amp; Lesion Analysis</Text>
          </View>
          <View style={styles.reportMetaRight}>
            <Text style={styles.reportHeading}>AI Analysis Report</Text>
            <Text style={styles.reportMetaText}>Scan ID: #{result.id || 'N/A'}</Text>
            <Text style={styles.reportMetaText}>Generated: {formattedDate}</Text>
          </View>
        </View>

        {/* 3. Scan Overview & AI Classification */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>1. Scan Overview &amp; Primary AI Finding</Text>
          <View style={styles.scanOverviewRow}>
            {/* Embedded Thumbnail (from local in-memory state) */}
            {localImageSrc ? (
              <View style={styles.scanImageContainer}>
                <Image src={localImageSrc} style={styles.scanImage} />
              </View>
            ) : null}

            <View style={styles.scanDetailsCol}>
              <View>
                <View style={styles.predictionBadgeRow}>
                  <Text
                    style={[
                      styles.urgencyBadge,
                      isHighUrgency
                        ? styles.urgencyHigh
                        : isModerateUrgency
                        ? styles.urgencyModerate
                        : styles.urgencyRoutine,
                    ]}
                  >
                    {diseaseInfo.categoryBadge} &bull; {diseaseInfo.type}
                  </Text>
                </View>
                <Text style={styles.predictionName}>Primary Match: {diseaseInfo.friendlyName}</Text>
                <Text style={styles.clinicalClassification}>
                  Clinical Category Name: {diseaseInfo.clinicalName} ({diseaseInfo.code})
                </Text>
              </View>

              <View>
                <Text style={styles.confidenceLine}>
                  AI Model Certainty: {confidencePercent}%
                </Text>
                <Text style={styles.nextStepText}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>Recommended Next Step: </Text>
                  {diseaseInfo.recommendedNextStep}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. Top-3 Confidence Breakdown (If Low Confidence <70%) */}
        {isLowConfidence && (
          <View style={styles.breakdownContainer}>
            <Text style={styles.breakdownTitle}>AI Confidence Breakdown (&lt;70% Certainty)</Text>
            <Text style={styles.breakdownExpl}>
              The AI was not highly confident on a single category &mdash; {topMatchName}{' '}
              {secondMatchName ? `and ${secondMatchName}` : ''} were the closest pattern matches.
              An in-person dermatological exam is recommended to clarify.
            </Text>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>&bull; Top Match ({topMatchName}):</Text>
              <Text style={styles.breakdownVal}>{top1Pct}%</Text>
            </View>

            {secondMatchName && top2Pct > 0 ? (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>&bull; Also Possible ({secondMatchName}):</Text>
                <Text style={styles.breakdownVal}>{top2Pct}%</Text>
              </View>
            ) : null}

            {otherRemainderPct > 0 ? (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>&bull; Other categories combined (remainder):</Text>
                <Text style={styles.breakdownVal}>{otherRemainderPct}%</Text>
              </View>
            ) : null}

            <Text style={styles.breakdownTip}>
              Photo Tip: Blurry focus, glare, or distant framing can lower certainty. Retaking with closer focus and natural light is recommended.
            </Text>
          </View>
        )}

        {/* 5. Patient Reported Context */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. Patient Reported Context</Text>
          <View style={styles.contextGrid}>
            <View style={styles.contextItem}>
              <Text style={styles.contextItemLabel}>Duration</Text>
              <Text style={styles.contextItemVal}>{ctx?.duration || 'Not specified'}</Text>
            </View>
            <View style={styles.contextItem}>
              <Text style={styles.contextItemLabel}>Recent Changes</Text>
              <Text style={styles.contextItemVal}>{ctx?.changes || 'None reported'}</Text>
            </View>
            <View style={styles.contextItem}>
              <Text style={styles.contextItemLabel}>Reported Symptoms</Text>
              <Text style={styles.contextItemVal}>
                {ctx?.symptoms && ctx.symptoms.length > 0 ? ctx.symptoms.join(', ') : 'None'}
              </Text>
            </View>
          </View>
        </View>

        {/* 6. Questions to Discuss with Doctor */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>3. Suggested Discussion Questions for Your Doctor</Text>
          <View style={styles.questionList}>
            {GENERAL_DOCTOR_QUESTIONS.map((q, idx) => (
              <View key={idx} style={styles.questionItem}>
                <Text style={styles.questionBullet}>&bull;</Text>
                <Text>&quot;{q}&quot;</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 7. Footer */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            DermAI Screening System &bull; Confidential Patient Report &bull; Not a Clinical Diagnosis
          </Text>
          <Text style={styles.footerText}>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
};

/**
 * Generates and downloads the client-side clinical PDF report,
 * and opens it directly in a new browser tab with the native PDF viewer.
 */
export async function downloadAnalysisReportPdf(
  result: DiagnosticResult,
  localImageSrc?: string
): Promise<void> {
  const doc = <AnalysisReportDocument result={result} localImageSrc={localImageSrc} />;
  const asPdf = pdf(doc);
  const rawBlob = await asPdf.toBlob();
  
  // Ensure strict application/pdf MIME type
  const pdfBlob = new Blob([rawBlob], { type: 'application/pdf' });
  const url = URL.createObjectURL(pdfBlob);

  // 1. Open directly in a new browser tab for immediate native PDF viewing / printing
  try {
    const newTab = window.open(url, '_blank');
    if (newTab) {
      newTab.focus();
    }
  } catch (e) {
    console.warn('Pop-up blocker prevented auto-opening PDF tab:', e);
  }

  // 2. Trigger direct .pdf file download
  const link = document.createElement('a');
  link.href = url;
  link.download = `DermAI_Report_Scan_${result.id || 'Skin'}.pdf`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Keep ObjectURL alive for 60 seconds to allow browser PDF viewer to render
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60000);
}
