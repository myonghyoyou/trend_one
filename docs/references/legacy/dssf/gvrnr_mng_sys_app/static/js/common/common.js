const CheckIsValidEmail = (accountField, domainField, fieldName) => {
  if (!fieldName) fieldName = "";

  // 이메일 검사: '@', '.' 이 둘다 포함될것.
  let email = "";

  if (!domainField) email = accountField.value;
  else email = accountField.value + "@" + domainField.value;

  const isValidEmail = email.includes("@") && email.includes(".");

  if (!isValidEmail) {
    openAlert("이메일 형식이 올바르지 않습니다.");
    setFocus(field);
    return false;
  }
};

/**
 * 들어온 값이 숫자로만 구성되어있는지 확인
 */
const CheckIsOnlyNum = (field, fieldName) => {
  let regExp = RegExp(/^[-]?\d+(?:[.]\d+)?$/);

  if (!regExp.test(field.value)) {
    openAlert(fieldName + "에는 숫자만 입력해주세요.");
    setFocus(field);
    return false;
  }
};

/**
 * 들어온 값이 영문과 숫자로만 구성되어있는지 확인
 */
const CheckIsOnlyEngOrNum = (field, fieldName) => {
  let fieldValue = field.value;
  let regExp = /^[0-9A-Za-z]+[A-Za-z0-9]{0,19}$/g;

  // val이 영문과 숫자로만 이루어져있는지 확인
  const isOnlyEngOrNum = regExp.test(fieldValue);

  if (!isOnlyEngOrNum) {
    openAlert(fieldName + "은 영어/숫자만을 포함해야 합니다.");
    setFocus(field);
    return false;
  }
};

/**
 * Value의 length와 Parameter로 전달된 최소 길이를 비교
 */
const CheckHasMinLength = (field, fieldName, minLength) => {
  const hasMinLength = field.value.length >= minLength;

  if (!hasMinLength) {
    openAlert(fieldName + "는 " + minLength + "자 이상이어야 합니다.");
    setFocus(field);
    return false;
  }
};

/**
 * Value의 length와 Parameter로 전달된 최대 길이를 비교
 */
const CheckHasMaxLength = (field, fieldName, maxLength) => {
  const hasMaxLength = field.value.length <= maxLength;

  if (!hasMaxLength) {
    openAlert(fieldName + "는 " + maxLength + "자 이하여야 합니다.");
    setFocus(field);
    return false;
  }
};

/**
 * Parameter로 들어온 2개의 Value가 동일한 지 비교 확인
 */
const CheckHasSameValue = (field1, field2, fieldName) => {
  const hasSameValue = field1.value === field2.value;

  if (!hasSameValue) {
    openAlert(fieldName + "가 일치하지 않습니다.");
    setFocus(field2);
    return false;
  }
};

/**
 * Parameter로 들어온 2개의 Value가 동일한 지 비교 확인
 */
const CheckIsChecked = (field, fieldName) => {
  const IsChecked = field.current.checked;

  console.log("isChecked : " + IsChecked);

  if (!IsChecked) {
    openAlert(fieldName + "에 동의하셔야 합니다.");
    setFocus(field);
    return false;
  }
};

/**
 * 사업자 등록번호 확인 (숫자만 10자리로 들어와야 함)
 */
const CheckIsValidBizId = (field) => {
  // bizID는 숫자만 10자리로 해서 문자열로 넘긴다.
  let bizID = field.value;

  console.log("bizId : " + bizID);

  let checkID = new Array(1, 3, 7, 1, 3, 7, 1, 3, 5, 1);
  let tmpBizID,
    i,
    chkSum = 0,
    c2,
    remander;
  bizID = bizID.replace(/-/gi, "");

  for (i = 0; i <= 7; i++) chkSum += checkID[i] * bizID.charAt(i);
  c2 = "0" + checkID[8] * bizID.charAt(8);
  c2 = c2.substring(c2.length - 2, c2.length);
  chkSum += Math.floor(c2.charAt(0)) + Math.floor(c2.charAt(1));
  remander = (10 - (chkSum % 10)) % 10;

  let isValidBizId = false;
  if (Math.floor(bizID.charAt(9)) === remander) isValidBizId = true; // OK!

  if (!isValidBizId) {
    openAlert("사업자번호 형식이 올바르지 않습니다.");
    setFocus(field);
    return false;
  }
};

/**
 * 해당 값이 공백인지 확인한다.
 * @param {*} value
 * @returns Boolean
 */
const CheckIsEmpty = (field, fieldName) => {
  const isEmpty = field.value === "";

  if (isEmpty) {
    openAlert(fieldName + "을(를) 입력해주세요.", "FAIL");
    setFocus(field);
    return false;
  }
};

/**
 * 첨부된 파일이 존재하는지 확인한다.
 * @param {*} value
 * @returns Boolean
 */
const CheckIsFileEmpty = (field, fieldName) => {
  const isEmpty = field.value === "";

  if (isEmpty) {
    openAlert(fieldName + " 파일을 첨부해주세요.");
    setFocus(field);
    return false;
  }
};

/**
 * 첨부된 파일이 존재하는지 확인한다.
 * @param {*} value
 * @returns Boolean
 */
 const CheckHasSpecialChar = (field, fieldName) => {
  const pattern_spc = /[~!@#$%^&*()_+|<>?:{}]/; // 특수문자
  const hasSpecialChar = pattern_spc.test(field.value);

  if (hasSpecialChar) {
    openAlert(fieldName + "에는 특수문자를 넣을 수 없습니다.");
    setFocus(field);
    return false;
  }
};

/*
 * 입력된 두 날짜의 시간 차이를 확인한다. 
 * @param  {day1, day2, measure}
 * @returns Integer
*/
const getDateDiff = (day1, day2, measure) => {
  let dateDiff = 0;

  if (measure == "DAY") {
    dateDiff = Math.floor((day2.getTime() - day1.getTime())/(24*3600*1000));
  } else if (measure == "WEEK") {
    dateDiff = parseInt((day2.getTime() - day1.getTime())/(24*3600*1000*7));
  } else if (measure == "MONTH") {
    let day1Year = day1.getFullYear();
    let day2Year = day2.getFullYear();
    let day1Month = day1.getMonth();
    let day2Month = day2.getMonth();
    
    dateDiff = (day2Month + 12 * day2Year) - (day1Month + 12 * day1Year);
  } else if (measure == "YEAR") {
    dateDiff = day2.getFullYear() - day1.getFullYear();
  }

  return dateDiff;
}

// 해당 필드 Focus
const setFocus = (field) => {
  field.focus();
};

//HTML 제거
function removeHTML(strHTML) {
  strHTML = strHTML.replace(
    /<(\/)?([a-zA-Z]*)(\\s[a-zA-Z]*=[^>]*)?(\\s)*(\/)?>/gi,
    ""
  );
  strHTML = strHTML.replace(/<(no)?script[^>]*>.*?<\/(no)?script>/gi, "");
  strHTML = strHTML.replace(/<style[^>]*>.*<\/style>/gi, "");
  strHTML = strHTML.replace(/<(\"[^\"]*\"|\'[^\']*\'|[^\'\">])*>/gi, "");
  strHTML = strHTML.replace(/<\\w+\\s+[^<]*\\s*>/gi, "");
  strHTML = strHTML.replace(/&[^;]+;/gi, "");
  strHTML = strHTML.replace(/\\s\\s+/gi, "");
  return strHTML;
}

// DATE Input에 오늘 날짜 입력
function entDateInput(field, simb) {
  if (event.keyCode != 13) return;
  setDateInput(field, simb);
}

function setDateInput(field, simb) {
  let today = new Date();

  let YYYY = today.getYear();
  let MM = today.getMonth() + 1;
  let DD = today.getDate();

  if (YYYY < 1000) YYYY = YYYY + 1900;
  if (MM < 10) MM = "0" + MM;
  if (DD < 10) DD = "0" + DD;

  let tmpYYYY = "";
  tmpYYYY = YYYY + "";

  if (field.value.length == 2)
    field.value = YYYY + simb + MM + simb + field.value;
  if (field.value.length == 4)
    field.value =
      YYYY +
      simb +
      field.value.substring(0, 2) +
      simb +
      field.value.substring(2, 4);
  if (field.value.length == 6)
    field.value =
      tmpYYYY.substring(0, 2) +
      field.value.substring(0, 2) +
      simb +
      field.value.substring(2, 4) +
      simb +
      field.value.substring(4, 6);
  if (field.value.length == 8)
    field.value =
      field.value.substring(0, 4) +
      simb +
      field.value.substring(4, 6) +
      simb +
      field.value.substring(6, 8);
}

// 페이지 Action 처리
function jsOnSubmit(FormObj, url, method, target) {
  if (!method) method = "POST";
  if (!target) target = "_top";

  FormObj.method = method;
  FormObj.target = target;
  FormObj.action = url;
  FormObj.submit();
}

// InnerHTML로 추가할 수 있게끔 Hidden 타입의 Input을 Name,Id,Value를 추가하여 String 형태로 반환
function getHiddenString(extrHiddenName, extrHiddenVal) {
  let strForm = "";
  for (k = 0; k < extrHiddenName.length; k++) {
    strForm =
      strForm +
      "<input type='hidden' name='" +
      extrHiddenName[k] +
      "' id='" +
      extrHiddenName[k] +
      "' value='" +
      extrHiddenVal[k] +
      "'>";
  }

  return strForm;
}

// getHiddenString 함수로 생성한 Html String을 Form에 삽입
function appendFormHiddenData(formID, extrHiddenName, extrHiddenVal) {
  let strForm = getHiddenString(extrHiddenName, extrHiddenVal);
  $("#" + formID).html(strForm);
}

//HTML String 타입의 Ajax Response를 선택한 HTML Element에 넣어준다.
function ajaxInnerHtmlOnSubmit(ajaxFormNM, goUrl, ajaxDivNM, ajaxMethod) {
  if (!ajaxMethod) ajaxMethod = "POST";
  if (!ajaxDivNM) ajaxDivNM = "";

  if (ajaxDivNM == "") {
    alert("타겟 ID가 지정되지 않았습니다.");
    return;
  }

  let frmNM = "form[name=" + ajaxFormNM + "]";
  let frmData = $("form[name=" + ajaxFormNM + "]").serialize();

  $.ajax({
    type: ajaxMethod,
    url: goUrl,
    async: false,
    cache: false,
    data: frmData,

    beforeSend: function () {},
    success: function (Response) {
      //let str = $("#"+ajaxDivNM);
      $("#" + ajaxDivNM).html("");
      $("#" + ajaxDivNM).html(Response);
    },
    error: function (request, textStatus, errorThrown) {},
    complete: function () {},
  });
}

//HTML String 타입의 Ajax Response를 선택한 HTML Element에 Append한다.
function ajaxAppndHtmlOnSubmit(ajaxFormNM, goUrl, ajaxDivNM, ajaxMethod) {
  if (!ajaxMethod) ajaxMethod = "POST";
  if (!ajaxDivNM) ajaxDivNM = "";

  if (ajaxDivNM == "") {
    alert("타겟 ID가 지정되지 않았습니다.");
    return;
  }

  let frmNM = "form[name=" + ajaxFormNM + "]";
  let frmData = $("form[name=" + ajaxFormNM + "]").serialize();

  $.ajax({
    type: ajaxMethod,
    url: goUrl,
    async: false,
    cache: false,
    data: frmData,

    beforeSend: function () {},
    success: function (Response) {
      let str = $("#" + ajaxDivNM);
      $("#" + ajaxDivNM).append(Response);
    },
    error: function (request, textStatus, errorThrown) {},
    complete: function () {},
  });
}

// Response에 대해 지정된 goFunc을 콜백으로 실행한다.
function ajaxCrudOnSubmit(ajaxFormNM, goUrl, ajaxMethod, goFunc) {
  if (!ajaxMethod) ajaxMethod = "POST";
  if (!goFunc) goFunc = "jsonCompResult";

  let frmNM = "form[name=" + ajaxFormNM + "]";
  let frmData = $("form[name=" + ajaxFormNM + "]").serializeArray();

  let formData = new FormData();

  frmData.forEach(function (data) {
    formData.append(data["name"], data["value"]);
  });

  if (
    $("input[name=upload_files]").length > 0 &&
    $("input[name=upload_files]")[0].files[0] != undefined
  ) {
    formData.append("upload_files", $("input[name=upload_files]")[0].files[0]);
  }

  $.ajax({
    type: ajaxMethod,
    url: goUrl,
    async: false,
    cache: false,
    processData: false,
    contentType: false,
    data: formData,

    beforeSend: function () {
      //console.log("beforesend");
    },
    success: function (Response) {
      let objFnc = goFunc + "( '" + Response + "' )";
      setTimeout(objFnc, 5);
    },
    error: function (request, textStatus, errorThrown) {
      console.log(errorThrown);
    },
    complete: function () { // 요청이 완료되면 실행
      //console.log("complete");
    },
  });
}

// 다중 파일 업로드 시 사용한다.
function ajaxMutipartSubmit(formData, goUrl, goFunc) {
  if (!goFunc) goFunc = "jsonCompResult";

  $.ajax({
    url: goUrl,
    data: formData,
    processData: false,
    contentType: false,
    type: "POST",
    success: function (Response) {
      let objFnc = goFunc + "( '" + Response + "' )";
      setTimeout(objFnc, 5);
    },
  });
}

//===============================================================================
//브라우저 관련 함수
//===============================================================================

// Id를 통해 해당 Element의 인덱스를 구한다.
function getIdIndex(obj) {
  let idNm = $(obj).attr("id");
  let tagName = $(obj).prop("tagName");
  let idxNm = tagName + "#" + idNm;
  let idx = $(obj).index(idxNm);

  return idx;
}

function getInputIdIndex(obj) {
  let idNm = $(obj).attr("id");
  let idx = $(obj).index("input#" + idNm);

  return idx;
}

// Element 배열로부터 특정 Element의 Value를 가져오거나 넣는다.
function getElemValFromInputArry(idNm, idx) {
  return $("input#" + idNm)[idx].value;
}

function setElemValFromInputArry(idNm, idx, val) {
  $("input#" + idNm)[idx].value = val;
}

function getElemValFromSelectArry(idNm, idx) {
  return $("select#" + idNm)[idx].value;
}

function setElemValFromSelectArry(idNm, idx, val) {
  $("select#" + idNm)[idx].value = val;
}

function getElemValFromRadioArry(idNm, idx) {
  return $("radio#" + idNm)[idx].value;
}

function getElemValFromCheckboxArry(idNm, idx) {
  return $("checkbox#" + idNm)[idx].value;
}

//브라우저의 너비를 구하여 반환한다.
function getBrowserWidth() {
  let browserWidth = document.body.clientWidth;

  return browserWidth;
}

//브라우져 높이를 구하여 반환한다.
function getBrowserHeight() {
  let browserHeight = document.body.clientHeight;

  return browserHeight;
}

//스크롤 수직이동 위치를 반환한다.
function getScrollTop() {
  return document.body.scrollTop;
}

//스크롤 수평이동 위치를 반환한다.
function getScrollLeft() {
  return document.body.scrollLeft;
}

//스크롤 높이를 반환한다.
function getScrollHeight() {
  return document.body.scrollHeight;
}

//브라우저 정중앙의 X좌표를 반환한다.
function getCenterPosX(Width) {
  CenterPosLeft = (getBwWidth() - Width) / 2; //브라우저세로사이즈
  return CenterPosLeft;
}

//브라우저 정중앙의 Y좌표를 반환한다.
function getCenterPosY(Height) {
  CenterPosTop = (getBwHeight() - Height) / 2 - Height; //브라우저가로사이즈
  return CenterPosLeft;
}

//객체 위치정보 구하기
function getObjectPosXY(aTag) {
  let oTmp = aTag;
  let pt = new Point(0, 0);
  do {
    pt.x += oTmp.offsetLeft;
    pt.y += oTmp.offsetTop;
    oTmp = oTmp.offsetParent;
  } while (oTmp.tagName != "BODY");
  return pt;
}

const goReload = () => {
  location.reload();
}

//===============================================================================
//======================== 오브젝트사이즈 관련 함수 =============================
//===============================================================================

//오브젝트 가로세로사이즈 조정하기
function setObjWHSize(objID, objWidth, objHeight) {
  if (objWidth > 0) objID.style.width = objWidth;
  if (objHeight > 0) objID.style.height = objHeight;
}

//컨텐츠메인 DIV가로사이즈 자동 맞춤
function setObjLeftPos(TargetDivID, LeftPos) {
  TargetDivID.style.left = LeftPos;
}

//프로그레스바 설정
function setProgress(Div) {
  let clientHeight = getBwHeight();

  if (Div == "ON") {
    progressDiv1.style.pixelTop = 0;
    progressDiv1.style.height = clientHeight;
    progressDiv1.style.visibility = "visible";
  } else {
    progressDiv1.style.visibility = "hidden";
  }
}

//===============================================================================
//========================== 부트스트랩 관련 함수 ===============================
//===============================================================================

