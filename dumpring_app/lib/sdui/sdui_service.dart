import 'dart:convert';
import 'package:http/http.dart' as http;
import 'sdui_model.dart';

class SduiService {
  static const String baseUrl = "https://dumpring-api.onrender.com";

  // 템플릿 ID를 받아 백엔드로부터 SDUI JSON 구조를 페치
  static Future<SduiComponent> fetchTemplate(String templateId, {String? token}) async {
    try {
      final response = await http.get(
        Uri.parse("$baseUrl/api/sdui/template/$templateId"),
        headers: {
          if (token != null) "Authorization": "Bearer $token",
          "Content-Type": "application/json",
        },
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(utf8.decode(response.bodyBytes));
        return SduiComponent.fromJson(decoded);
      }
    } catch (_) {
      // 에러 시 또는 백엔드 미구현 시 피그마 다크-골드 프리셋으로 폴백 작동
    }

    // 로컬 폴백 프리셋 리턴
    return SduiComponent.fromJson(_getMockTemplate(templateId));
  }

  // 피그마 디자인 컨셉이 고스란히 반영된 다크-골드 템플릿 프리셋 뱅크
  static Map<String, dynamic> _getMockTemplate(String templateId) {
    switch (templateId) {
      case 'role_selection':
        return {
          'type': 'container',
          'props': {
            'backgroundColor': '0xFF0A0F1D', // 딥 다크 블루
            'padding': {'left': 24.0, 'right': 24.0, 'top': 40.0, 'bottom': 40.0},
          },
          'children': [
            {
              'type': 'column',
              'props': {
                'crossAxisAlignment': 'stretch',
              },
              'children': [
                {
                  'type': 'text',
                  'props': {
                    'text': '덤프링에 오신 것을 환영합니다! 🎉',
                    'fontSize': 24.0,
                    'fontWeight': 'w800',
                    'color': '0xFFFFD700', // Neon Gold
                    'textAlign': 'center',
                  }
                },
                {
                  'type': 'spacer',
                  'props': {'height': 12.0}
                },
                {
                  'type': 'text',
                  'props': {
                    'text': '가입하시려는 회원 유형을 선택해 주세요.\n서버 드리븐 UI 시스템으로 실시간 동적 화면이 구성됩니다.',
                    'fontSize': 14.0,
                    'color': '0xFF8E9AA8',
                    'textAlign': 'center',
                  }
                },
                {
                  'type': 'spacer',
                  'props': {'height': 36.0}
                },

                // 1. 기사 카드
                {
                  'type': 'card',
                  'props': {
                    'backgroundColor': '0xFF1E2638',
                    'borderColor': '0xFFFFD700',
                    'borderRadius': 16.0,
                    'margin': {'bottom': 16.0},
                    'padding': 16.0,
                  },
                  'action': {
                    'type': 'navigate',
                    'target': 'register_driver',
                  },
                  'children': [
                    {
                      'type': 'row',
                      'props': {'mainAxisAlignment': 'spaceBetween'},
                      'children': [
                        {
                          'type': 'row',
                          'children': [
                            {'type': 'icon', 'props': {'icon': 'local_shipping', 'color': '0xFFFFD700', 'size': 30.0}},
                            {'type': 'spacer', 'props': {'width': 12.0}},
                            {
                              'type': 'column',
                              'props': {'crossAxisAlignment': 'start'},
                              'children': [
                                {'type': 'text', 'props': {'text': '덤프 트럭 기사', 'fontSize': 18.0, 'fontWeight': 'bold', 'color': '0xFFFFD700'}},
                                {'type': 'spacer', 'props': {'height': 4.0}},
                                {'type': 'text', 'props': {'text': '실시간 콜 수락 및 미터기 운행 기능 제공', 'fontSize': 12.0, 'color': '0xFF8E9AA8'}},
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },

                // 2. 차주 카드
                {
                  'type': 'card',
                  'props': {
                    'backgroundColor': '0xFF1E2638',
                    'borderRadius': 16.0,
                    'margin': {'bottom': 16.0},
                    'padding': 16.0,
                  },
                  'action': {
                    'type': 'navigate',
                    'target': 'register_owner',
                  },
                  'children': [
                    {
                      'type': 'row',
                      'children': [
                        {'type': 'icon', 'props': {'icon': 'badge', 'color': '0xFFFFD700', 'size': 30.0}},
                        {'type': 'spacer', 'props': {'width': 12.0}},
                        {
                          'type': 'column',
                          'props': {'crossAxisAlignment': 'start'},
                          'children': [
                            {'type': 'text', 'props': {'text': '덤프 트럭 차주', 'fontSize': 18.0, 'fontWeight': 'bold', 'color': '0xFFFFFFFF'}},
                            {'type': 'spacer', 'props': {'height': 4.0}},
                            {'type': 'text', 'props': {'text': '소속 기사 및 차량 관리, 정산 기능 제공', 'fontSize': 12.0, 'color': '0xFF8E9AA8'}},
                          ]
                        }
                      ]
                    }
                  ]
                },

                // 3. 현장 관리자 카드
                {
                  'type': 'card',
                  'props': {
                    'backgroundColor': '0xFF1E2638',
                    'borderRadius': 16.0,
                    'margin': {'bottom': 16.0},
                    'padding': 16.0,
                  },
                  'action': {
                    'type': 'navigate',
                    'target': 'register_site',
                  },
                  'children': [
                    {
                      'type': 'row',
                      'children': [
                        {'type': 'icon', 'props': {'icon': 'engineering', 'color': '0xFFFFD700', 'size': 30.0}},
                        {'type': 'spacer', 'props': {'width': 12.0}},
                        {
                          'type': 'column',
                          'props': {'crossAxisAlignment': 'start'},
                          'children': [
                            {'type': 'text', 'props': {'text': '공사 현장 소장 / 담당자', 'fontSize': 18.0, 'fontWeight': 'bold', 'color': '0xFFFFFFFF'}},
                            {'type': 'spacer', 'props': {'height': 4.0}},
                            {'type': 'text', 'props': {'text': '오더 발행 및 출입 덤프 직접 통제', 'fontSize': 12.0, 'color': '0xFF8E9AA8'}},
                          ]
                        }
                      ]
                    }
                  ]
                },

                // 4. 하차지 지주 카드
                {
                  'type': 'card',
                  'props': {
                    'backgroundColor': '0xFF1E2638',
                    'borderRadius': 16.0,
                    'margin': {'bottom': 16.0},
                    'padding': 16.0,
                  },
                  'action': {
                    'type': 'navigate',
                    'target': 'register_dropoff',
                  },
                  'children': [
                    {
                      'type': 'row',
                      'children': [
                        {'type': 'icon', 'props': {'icon': 'landscape', 'color': '0xFFFFD700', 'size': 30.0}},
                        {'type': 'spacer', 'props': {'width': 12.0}},
                        {
                          'type': 'column',
                          'props': {'crossAxisAlignment': 'start'},
                          'children': [
                            {'type': 'text', 'props': {'text': '사토 하차지 지주', 'fontSize': 18.0, 'fontWeight': 'bold', 'color': '0xFFFFFFFF'}},
                            {'type': 'spacer', 'props': {'height': 4.0}},
                            {'type': 'text', 'props': {'text': '현장별 토사 수용량 한도 및 반입 대기열 통제', 'fontSize': 12.0, 'color': '0xFF8E9AA8'}},
                          ]
                        }
                      ]
                    }
                  ]
                },
              ]
            }
          ]
        };

      case 'pending_approval':
        return {
          'type': 'container',
          'props': {
            'backgroundColor': '0xFF0A0F1D',
            'padding': {'left': 24.0, 'right': 24.0, 'top': 80.0, 'bottom': 40.0},
          },
          'children': [
            {
              'type': 'column',
              'props': {
                'crossAxisAlignment': 'stretch',
                'mainAxisAlignment': 'center',
              },
              'children': [
                {
                  'type': 'icon',
                  'props': {
                    'icon': 'check_circle',
                    'color': '0xFFFFD700',
                    'size': 80.0,
                  }
                },
                {
                  'type': 'spacer',
                  'props': {'height': 30.0}
                },
                {
                  'type': 'text',
                  'props': {
                    'text': '가입 승인 대기 중',
                    'fontSize': 26.0,
                    'fontWeight': 'w800',
                    'color': '0xFFFFD700',
                    'textAlign': 'center',
                  }
                },
                {
                  'type': 'spacer',
                  'props': {'height': 16.0}
                },
                {
                  'type': 'text',
                  'props': {
                    'text': '덤프링 관리자가 서류 심사 및 가입 승인을 진행하고 있습니다.\n심사는 보통 1~2 영업일이 소요됩니다.',
                    'fontSize': 15.0,
                    'color': '0xFF8E9AA8',
                    'textAlign': 'center',
                  }
                },
                {
                  'type': 'spacer',
                  'props': {'height': 50.0}
                },
                {
                  'type': 'button',
                  'props': {
                    'text': '고객센터 연락하기',
                    'variant': 'secondary',
                  },
                  'action': {
                    'type': 'dialog',
                    'title': '고객센터 안내',
                    'message': '덤프링 고객센터: 1544-XXXX\n(운영시간: 평일 09:00 ~ 18:00)',
                  }
                },
                {
                  'type': 'spacer',
                  'props': {'height': 16.0}
                },
                {
                  'type': 'button',
                  'props': {
                    'text': '새로고침',
                    'variant': 'primary',
                  },
                  'action': {
                    'type': 'api_call',
                    'endpoint': '/api/auth/member-status',
                  }
                }
              ]
            }
          ]
        };

      default:
        // 기본 웰컴 에러 템플릿
        return {
          'type': 'container',
          'props': {
            'backgroundColor': '0xFF0A0F1D',
            'padding': 24.0,
          },
          'children': [
            {
              'type': 'column',
              'props': {
                'mainAxisAlignment': 'center',
                'crossAxisAlignment': 'center',
              },
              'children': [
                {'type': 'icon', 'props': {'icon': 'info', 'color': '0xFFFFD700', 'size': 48.0}},
                {'type': 'spacer', 'props': {'height': 16.0}},
                {'type': 'text', 'props': {'text': '정의되지 않은 템플릿: $templateId', 'fontSize': 18.0, 'fontWeight': 'bold', 'color': '0xFFFFFFFF'}},
                {'type': 'spacer', 'props': {'height': 8.0}},
                {'type': 'text', 'props': {'text': '백엔드 UI JSON 레이아웃을 등록해 주세요.', 'fontSize': 13.0, 'color': '0xFF8E9AA8'}},
              ]
            }
          ]
        };
    }
  }

  // 피그마 SOLID 채우기 색상(RGB)을 Flutter 0xFFxxxxxx Hex 색상으로 파싱하는 유틸리티
  static String? _parseFigmaColor(Map? fill) {
    if (fill == null || fill['type'] != 'SOLID') return null;
    final color = fill['color'] as Map?;
    if (color == null) return null;
    final r = (((color['r'] ?? 0.0) as num).toDouble() * 255).round().clamp(0, 255);
    final g = (((color['g'] ?? 0.0) as num).toDouble() * 255).round().clamp(0, 255);
    final b = (((color['b'] ?? 0.0) as num).toDouble() * 255).round().clamp(0, 255);
    final a = (((color['opacity'] ?? color['a'] ?? 1.0) as num).toDouble() * 255).round().clamp(0, 255);
    return '0x${a.toRadixString(16).padLeft(2, '0')}${r.toRadixString(16).padLeft(2, '0')}${g.toRadixString(16).padLeft(2, '0')}${b.toRadixString(16).padLeft(2, '0')}';
  }

  // 피그마 노드 구조를 덤프링 SDUI 규격으로 온더플라이(On-the-fly) 변환하는 Dart 엔진
  static Map<String, dynamic> convertFigmaNodeToSdui(Map<String, dynamic> node) {
    final String type = node['type'] ?? '';
    final String name = node['name'] ?? '';

    // 피그마 node fills에서 배경색 추출
    final fills = node['fills'] as List?;
    String? bgColor;
    if (fills != null && fills.isNotEmpty) {
      bgColor = _parseFigmaColor(Map<String, dynamic>.from(fills.first));
    }

    Map<String, dynamic> sdui = {
      'type': 'container',
      'props': {
        'backgroundColor': bgColor ?? '0xFF0A0F1D',
        'padding': {
          'left': ((node['horizontalPadding'] ?? 16.0) as num).toDouble(),
          'right': ((node['horizontalPadding'] ?? 16.0) as num).toDouble(),
          'top': ((node['verticalPadding'] ?? 16.0) as num).toDouble(),
          'bottom': ((node['verticalPadding'] ?? 16.0) as num).toDouble(),
        },
      },
      'children': [],
    };

    if (type == 'TEXT') {
      final String textVal = node['characters'] ?? name;
      
      // 글자 색상 추출
      String? textColor;
      if (fills != null && fills.isNotEmpty) {
        textColor = _parseFigmaColor(Map<String, dynamic>.from(fills.first));
      }

      // 글자 크기 추출
      final style = node['style'] as Map?;
      final double fontSize = ((style?['fontSize'] ?? 16.0) as num).toDouble();

      sdui['type'] = 'text';
      sdui['props'] = {
        'text': textVal,
        'fontSize': fontSize,
        'color': textColor ?? '0xFFFFFFFF',
        'fontWeight': name.toLowerCase().contains('bold') ? 'bold' : 'normal',
      };
      return sdui;
    } else if (name.toLowerCase().contains('btn') || name.toLowerCase().contains('button')) {
      sdui['type'] = 'button';
      sdui['props'] = {
        'text': name.contains('-') ? name.split('-').last : '버튼',
        'variant': 'primary',
        if (bgColor != null) 'backgroundColor': bgColor,
      };
      return sdui;
    }

    final children = node['children'] as List?;
    if (children != null && children.isNotEmpty) {
      final bool isHorizontal = node['layoutMode'] == 'HORIZONTAL';
      sdui['type'] = isHorizontal ? 'row' : 'column';
      sdui['props'] = {
        'mainAxisAlignment': isHorizontal ? 'spaceBetween' : 'start',
        'crossAxisAlignment': 'center',
      };
      sdui['children'] = children.map((c) => convertFigmaNodeToSdui(Map<String, dynamic>.from(c))).toList();
    }

    return sdui;
  }

  // 피그마 파일 키와 노드 ID를 가지고 피그마 REST API를 직접 다이렉트로 호출하여 dynamic UI 컴포넌트 렌더링
  static Future<SduiComponent> fetchFigmaDirect(String fileKey, String nodeId) async {
    // Figma 토큰은 환경변수 또는 서버에서 전달받아 사용
    // 보안을 위해 하드코딩하지 않음
    const String figmaToken = String.fromEnvironment('FIGMA_TOKEN', defaultValue: '');
    final response = await http.get(
      Uri.parse("https://api.figma.com/v1/files/$fileKey/nodes?ids=$nodeId"),
      headers: {
        "X-Figma-Token": figmaToken,
      },
    ).timeout(const Duration(seconds: 10));

    if (response.statusCode == 200) {
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      final nodes = decoded['nodes'] as Map?;
      if (nodes != null && nodes.isNotEmpty) {
        final nodeData = nodes.values.first;
        final doc = nodeData['document'] as Map?;
        if (doc != null) {
          final sduiJson = convertFigmaNodeToSdui(Map<String, dynamic>.from(doc));
          return SduiComponent.fromJson(sduiJson);
        }
      }
    }
    throw Exception("피그마 노드를 파싱하지 못했습니다. 응답 코드: ${response.statusCode}");
  }
}
