document.addEventListener(
  "keydown",
  function (event) {
    if (event.keyCode === 13) {
      event.preventDefault();
    }
  },
  true
);

let PROC_CHK = "FIRSTLOAD";
let contForm = "contForm";
let contFormObj = document.contForm;
let contFormStr = "document.contForm";
let gvrnrUids = "";
let gvrnrNmsStr = "";
let gvrnrNms = [];
let press2Data = [];
let press2ChartData = [];
let myChart = undefined;
let mainWidth = "";
/*
let press1Data = [];
let trnsps1Data = [];
let trnsps2Data = [];
*/
let xAxisList = [];
let chkboxCnt = 0;
const csvFileInput = document.querySelector("#upload_files");
const dropdownIcon = document.querySelector(".dropdown-icon");
const dropdownBtn = document.querySelector(".dropdown-btn");
const manualBtns = document.querySelectorAll(".manual-btn");
const intervalSel = document.querySelector("#interval-sel");
const mainElem = document.querySelector("main");

// 드롭다운 메뉴 이벤트
/*
dropdownBtn.addEventListener("click", ()=>{
    if(dropdownBtn.classList.contains("show")) {
        dropdownBtn.classList.remove("bi-caret-down-fill");
        dropdownBtn.classList.add("bi-caret-up-fill");
    } else {
        dropdownBtn.classList.remove("bi-caret-up-fill");
        dropdownBtn.classList.add("bi-caret-down-fill");
    }
});
*/

window.onload = () => {
  // resizeCol();

  initializeChart();

  // 브라우저 사이즈가 변하면 차트 사이즈도 조정되도록 Resize 이벤트 추가
  window.addEventListener("resize", (e) => {
    myChart.resize();

    // resizeCol();
  });

  // 각각의 테이블 헤더("1차 압력", "2차 압력", "1차 전위", "2차 전위")에 클릭 이벤트 추가

  /*
    let theads = document.querySelectorAll(".data-table.thead.tr.th");

    for(let i = 0; i < theads.length; i++) {
        theads[i].addEventListener("click", (e) => {
            
            if(press1Data.length == 0 || press2Data.length == 0 || trnsps1Data.length == 0 || trnsps2Data.length == 0) {
                openAlert("조회된 데이터가 존재하지 않습니다.", "FAIL");
                return;
            }
            
            if(document.querySelector(".selected") != null) document.querySelector(".selected").classList.remove("selected");
            
            e.target.classList.add("selected");

            let chartTitle = "";
            chartTitle += (theads[i].classList.contains("press1")) ? "1차 압력 : "
                        : (theads[i].classList.contains("trnsps1")) ? "1차 전위 : "
                        : (theads[i].classList.contains("press2")) ? "2차 압력 : "
                        : (theads[i].classList.contains("trnsps2")) ? "2차 전위 : "
                        : "";

            chartTitle += (contFormObj.intervalNum.value == "") ? "1-3분 간격"
                        : (contFormObj.intervalNum.value == "9") ? "9분 간격"
                        : (contFormObj.intervalNum.value == "15") ? "15분 간격"
                        : (contFormObj.intervalNum.value == "21") ? "21분 간격"
                        : "";
            
            // 조회한 데이터에 대한 차트 설정 옵션 정의
            let newOption = {
                title: {
                    show: true,
                    text: chartTitle,
                    textStyle: {
                        fontFamily: 'Arial'
                    }
                }, 
                xAxis: {
                    type: 'category',
                    min: 0,
                    max: 20000,
                    boundaryGap: true,
                    data: xAxisList,
                    axisLabel: {
                      rotate: 30,
                      lineHeight: 56,
                      padding: [100, 0, 0, 0]
                    },
                    axisTick: {
                        alignWithLabel: true
                    }
                },
                series: []
            };
            
            // 차트에 들어갈 데이터 시리즈 삽입
            for(let k = 0; k < gvrnrNms.length; k ++) {
                newOption.series.push(
                    {
                        name: gvrnrNms[k],
                        data: (theads[i].classList.contains("press1")) ? press1Data[k]
                              : (theads[i].classList.contains("press2")) ? press2Data[k]
                              : (theads[i].classList.contains("trnsps1")) ? trnsps1Data[k]
                              : trnsps2Data[k],
                        type: "line"
                    }
                )
            }

            myChart.setOption(newOption, {replaceMerge : ['series','xAxis','title']});
        })
    }
    */

  // 각각의 매뉴얼 목차 버튼에 클릭 이벤트 추가
  manualBtns.forEach((btn, idx) => {
    btn.addEventListener("click", () => {
      if ($(".manual-group")[idx].style.display == "block")
        $(".manual-group").eq(idx).hide();
      else $(".manual-group").eq(idx).show();
    });
  });

  //오늘 기준으로 정압기 검색의 '시작일', '종료일' 설정
  const today = new Date();
  const startDate = new Date(today.getTime() - 7 * (24 * 3600 * 1000));
  $("#startDate").val(startDate.toISOString().substring(0, 10));
  $("#endDate").val(today.toISOString().substring(0, 10));

  // "CSV 파일 업로드" 버튼에 클릭 이벤트 추가
  uploadBtn.addEventListener("click", () => {
    // goUrl = "/createTransaction/";

    // ajaxCrudOnSubmit(contForm, goUrl);

    openConfirm(
      "해당 날짜에 등록된 데이터가 삭제됩니다. 그래도 업로드 하시겠습니까?",
      csvFileUpload
    );
  });

  // 시간 간격 설정 Select에 Change 이벤트 추가
  intervalSel.addEventListener("change", (e) => {
    contFormObj.intervalNum.value = e.target.value;

    goInquire("REFRESH");
  });

  // getTransactionsInProgress();
};

// window.onError = function (msg, url, line, col, error) {
//   checkTransactionStatus();
// };

// AJAX 통신 후 돌아오는 Response에 대한 처리
function jsonCompResult(resJson) {
  let resStr = eval("(" + resJson + ")");

  // CSV 파일 업로드에 쓰인 File Input은 업로드 성공 여부와 상관없이
  // 공백으로 초기화되어야함.
  csvFileInput.value = "";

  if (resStr.resCd != "0000") {
    closeLoader();

    if (resStr.resCd == "0002") {
      openAlert(resStr.resMsg, "FAIL", "removeAllContents()");
      //openAlert(resStr.resMsg, "FAIL");
    } else {
      openAlert(resStr.resMsg, "FAIL");
    }

    return;
  } else {
    if (PROC_CHK == "SRCH") {
      const gvrnrTbBody = document.querySelector(".gvrnr-table-body");

      while (gvrnrTbBody.hasChildNodes()) {
        gvrnrTbBody.removeChild(gvrnrTbBody.childNodes[0]);
      }

      //console.log(resStr.gvrnrList);

      if (resStr.gvrnrList.length > 0) {
        resStr.gvrnrList.forEach((gvrnr, idx) => {
          let tmpTrElem = document.createElement("tr");
          let tmpTdElem1 = document.createElement("td");
          let tmpInputElem = document.createElement("input");
          let tmpTdElem2 = document.createElement("td");
          let tmpTdElem3 = document.createElement("td");
          let tmpTdElem4 = document.createElement("td");

          tmpInputElem.type = "checkbox";
          tmpInputElem.classList.add("form-check-input");
          tmpInputElem.id = "gvrnrCheckbox";
          tmpInputElem.name = gvrnr.gvrnr_nm;
          tmpTdElem1.id = "checkbox-row";
          tmpTdElem2.id = "region-row";
          tmpTdElem4.id = "inspct-day-row";

          tmpInputElem.addEventListener("click", (e) => {
            if (!e.target.checked) chkboxCnt--;

            if (chkboxCnt >= 3) {
              openAlert("정압기는 3개 이상 선택할 수 없습니다.", "FAIL");
              e.target.checked = false;
            }

            if (e.target.checked) chkboxCnt++;
          });

          tmpTdElem1.appendChild(tmpInputElem);
          tmpTrElem.appendChild(tmpTdElem1);
          tmpTrElem.appendChild(tmpTdElem2);
          tmpTrElem.appendChild(tmpTdElem3);
          tmpTrElem.appendChild(tmpTdElem4);

          tmpInputElem.value = gvrnr.gvrnr_uid;
          tmpTdElem2.innerHTML = gvrnr.cd_name;
          tmpTdElem3.innerHTML = gvrnr.gvrnr_nm;
          tmpTdElem4.innerHTML =
            gvrnr.inspct_day == "MON"
              ? "월"
              : gvrnr.inspct_day == "TUE"
              ? "화"
              : gvrnr.inspct_day == "WED"
              ? "수"
              : gvrnr.inspct_day == "THU"
              ? "목"
              : gvrnr.inspct_day == "FRI"
              ? "금"
              : "";

          gvrnrTbBody.appendChild(tmpTrElem);
        });
      } else {
        let tmpTrElem = document.createElement("tr");
        let tmpTdElem1 = document.createElement("td");
        tmpTdElem1.colSpan = "3";
        tmpTdElem1.innerHTML = "해당 조건과 일치하는 검색 결과가 없습니다.";

        alert("해당 조건과 일치하는 검색 결과가 없습니다.");

        tmpTrElem.appendChild(tmpTdElem1);
        gvrnrTbBody.appendChild(tmpTrElem);
      }

      closeLoader();

      return;
    } else if (PROC_CHK == "INQ") {
      //let gvrnrSelElem = document.querySelector(".gvrnr-sel");
      const resultTableBody = document.querySelector("#result-table-body");
      // Object를 For문으로 돌리기 위해 Key들을 받아온다.

      console.log("tmpKeys : ", Object.keys(resStr.statDataObj));

      const tmpKeys = Object.keys(resStr.statDataObj);
      const resultTableHead = document.querySelector(".data-table thead tr");
      const resultStatBody = document.querySelector(".result-stat-wrapper");

      gvrnrNms.length = 0;
      press2Data.length = 0;
      press2ChartData.length = 0;

      while (resultTableHead.hasChildNodes()) {
        resultTableHead.removeChild(resultTableHead.childNodes[0]);
      }

      const recordDttmHead = document.createElement("th");
      recordDttmHead.innerHTML = "측정일";

      resultTableHead.appendChild(recordDttmHead);

      while (resultTableBody.hasChildNodes()) {
        resultTableBody.removeChild(resultTableBody.childNodes[0]);
      }

      while (resultStatBody.hasChildNodes()) {
        resultStatBody.removeChild(resultStatBody.childNodes[0]);
      }

      // 위에서 얻어낸 Key로 서버로부터 받아온 정압기 수치 데이터를 For문을 돌려가며 가공하고 UI에 반영해준다.
      tmpKeys.forEach((key, keyIdx) => {
        const tmpTableHead = document.createElement("th");
        tmpTableHead.innerHTML = resStr.statDataObj[key].gvrnr_nm;
        //+ "<br>2차 압력";

        console.log(keyIdx);

        resultTableHead.appendChild(tmpTableHead);

        resStr.statDataObj[key].record_dttm.forEach((dttm, idx) => {
          let tmpPress2TdElem = document.createElement("td");

          try {
            if (resStr.statDataObj[key].gvrnr_press2[idx] != null)
              tmpPress2TdElem.innerHTML = resStr.statDataObj[key].gvrnr_press2[
                idx
              ].toFixed(3);
            else tmpPress2TdElem.innerHTML = "";

            let tmpRecordDttmTdElem = document.createElement("td");
            tmpRecordDttmTdElem.innerHTML = dttm;

            if (keyIdx == 0) {
              let tmpTrElem = document.createElement("tr");

              tmpTrElem.appendChild(tmpRecordDttmTdElem);
              tmpTrElem.appendChild(tmpPress2TdElem);

              resultTableBody.appendChild(tmpTrElem);
            } else {
              if (resultTableBody.childNodes[idx] == undefined) {
                let tmpTrElem = document.createElement("tr");
                let tmpPress1TdElem = document.createElement("td");

                tmpTrElem.appendChild(tmpRecordDttmTdElem);
                tmpTrElem.appendChild(tmpPress1TdElem);
                tmpTrElem.appendChild(tmpPress2TdElem);
                resultTableBody.appendChild(tmpTrElem);
              } else {
                resultTableBody.childNodes[idx].appendChild(tmpPress2TdElem);
              }
            }
          } catch (e) {
            console.log(key);
            console.log(keyIdx);
            console.log(idx);
            console.log(dttm);
          }
        });

        gvrnrNms.push(resStr.statDataObj[key].gvrnr_nm);
        press2Data.push(resStr.statDataObj[key].gvrnr_press2);
        press2ChartData.push(resStr.statDataObj[key].gvrnr_press2_chart);
        xAxisList = resStr.xAxisList;
      });

      if (press2ChartData.length == 0) {
        //if(press1Data.length == 0 || press2Data.length == 0 || trnsps1Data.length == 0 || trnsps2Data.length == 0) {
        openAlert("조회된 데이터가 존재하지 않습니다.", "FAIL");
        return;
      }

      let chartTitle = "2차 압력 : ";
      /*
            chartTitle += (theads[i].classList.contains("press1")) ? "1차 압력 : "
                        : (theads[i].classList.contains("trnsps1")) ? "1차 전위 : "
                        : (theads[i].classList.contains("press2")) ? "2차 압력 : "
                        : (theads[i].classList.contains("trnsps2")) ? "2차 전위 : "
                        : "";
            */

      chartTitle +=
        contFormObj.intervalNum.value == ""
          ? "10분 간격"
          : contFormObj.intervalNum.value == "20"
          ? "20분 간격"
          : contFormObj.intervalNum.value == "30"
          ? "30분 간격"
          : contFormObj.intervalNum.value == "30"
          ? "40분 간격"
          : "";

      // 조회한 데이터에 대한 차트 설정 옵션 정의
      let newOption = {
        title: {
          show: true,
          text: chartTitle,
          textStyle: {
            fontFamily: "Arial",
            fontSize: window.innerWidth > 1280 ? 18 : 14,
          },
        },
        xAxis: {
          type: "category",
          min: 0,
          max: 500,
          boundaryGap: true,
          data: xAxisList,
          axisLabel: {
            rotate: 30,
            lineHeight: 56,
            padding: [100, 0, 0, 0],
            fontSize: window.innerWidth > 1280 ? 12 : 10,
          },
          axisTick: {
            alignWithLabel: true,
          },
        },
        yAxis: {
          min: 1.7,
          max: 3,
        },
        series: [],
      };

      let dataAvgList = [];

      // 차트에 들어갈 데이터 시리즈 삽입 및 최소,평균,최대값 테이블 생성
      for (let k = 0; k < gvrnrNms.length; k++) {
        // 데이터 시리즈 삽입
        newOption.series.push({
          name: gvrnrNms[k],
          data: press2ChartData[k],
          type: "line",
        });

        // 테이블 생성
        let statTable = document.createElement("table");

        statTable.classList.add("table");
        statTable.classList.add("table-bordered");
        statTable.classList.add("summary-table");

        let statTableHead = document.createElement("thead");
        let statTableHeadTr = document.createElement("tr");
        let statTableHeadTh = document.createElement("th");
        let statTableBody = document.createElement("tbody");
        statTableHeadTr.classList.add("table-secondary");

        if (window.innerWidth > 4000) {
          statTableHeadTh.colSpan = "2";
          statTableHeadTh.innerHTML = gvrnrNms[k];
          statTableHeadTr.appendChild(statTableHeadTh);
          statTableHead.appendChild(statTableHeadTr);
          statTable.appendChild(statTableHead);

          for (let i = 0; i < 3; i++) {
            let statTableBodyTr = document.createElement("tr");
            let statTableBodyTitleTd = document.createElement("td");
            let statTableBodyCntntTd = document.createElement("td");

            press2Data[k] = press2Data[k].filter((e) => e !== null);

            if (i == 0) {
              statTableBodyTitleTd.innerHTML = "MIN";
              statTableBodyCntntTd.innerHTML = press2Data[k]
                .sort()[0]
                .toFixed(2);
            } else if (i == 1) {
              statTableBodyTitleTd.innerHTML = "AVG";
              statTableBodyCntntTd.innerHTML = (
                press2Data[k].reduce((a, b) => a + b, 0) / press2Data[k].length
              ).toFixed(2);
            } else if (i == 2) {
              statTableBodyTitleTd.innerHTML = "MAX";
              statTableBodyCntntTd.innerHTML = press2Data[k]
                .sort()
                [press2Data[k].length - 1].toFixed(2);
            }

            statTableBodyTr.appendChild(statTableBodyTitleTd);
            statTableBodyTr.appendChild(statTableBodyCntntTd);
            statTableBody.appendChild(statTableBodyTr);
          }
        } else {
          statTableHeadTh.rowSpan = "2";
          statTableHeadTh.innerHTML = gvrnrNms[k];

          let minHeadTh = document.createElement("th");
          minHeadTh.innerHTML = "MIN";
          let avgHeadTh = document.createElement("th");
          avgHeadTh.innerHTML = "AVG";
          let maxHeadTh = document.createElement("th");
          maxHeadTh.innerHTML = "MAX";

          statTableHeadTr.appendChild(statTableHeadTh);
          statTableHeadTr.appendChild(minHeadTh);
          statTableHeadTr.appendChild(avgHeadTh);
          statTableHeadTr.appendChild(maxHeadTh);

          let statTableBodyTr = document.createElement("tr");

          for (let i = 0; i < 3; i++) {
            let statTableBodyCntntTd = document.createElement("td");

            press2Data[k] = press2Data[k].filter((e) => e !== null);

            if (i == 0) {
              statTableBodyCntntTd.innerHTML = press2Data[k]
                .sort()[0]
                .toFixed(2);
            } else if (i == 1) {
              statTableBodyCntntTd.innerHTML = (
                press2Data[k].reduce((a, b) => a + b, 0) / press2Data[k].length
              ).toFixed(2);
            } else if (i == 2) {
              statTableBodyCntntTd.innerHTML = press2Data[k]
                .sort()
                [press2Data[k].length - 1].toFixed(2);
            }

            statTableBodyTr.appendChild(statTableBodyCntntTd);
          }

          statTableBody.appendChild(statTableHeadTr);
          statTableBody.appendChild(statTableBodyTr);
        }

        dataAvgList.push(
          parseFloat(
            (
              press2Data[k].reduce((a, b) => a + b, 0) / press2Data[k].length
            ).toFixed(2)
          )
        );

        statTable.appendChild(statTableBody);
        resultStatBody.appendChild(statTable);
      }

      for (let i = 0; i < dataAvgList.length; i++) {
        if (dataAvgList[i] >= 3 || dataAvgList[i] <= 1.7) {
          newOption["yAxis"] = {};
          break;
        }
      }

      myChart.setOption(newOption, {
        replaceMerge: ["series", "xAxis", "yAxis", "title"],
      });

      $.each($("#gvrnrCheckbox:checked"), (idx, checkbox) => {
        checkbox.checked = false;
      });

      chkboxCnt = 0;

      // myChart.resize();
      closeLoader();

      return;
    } else if (PROC_CHK == "INS") {
      closeLoader();
      openAlert("업로드가 완료되었습니다.", "SUCCESS");

      return;
    } else if (PROC_CHK == "UPD") {
    } else if (PROC_CHK == "DEL") {
    } else if (PROC_CHK == "ING") {
      closeLoader();

      let parsedData = JSON.parse(resJson);

      // if (resStr.resCd == "0000") {
      //   // openAlert("진행 중인 작업이 있습니다.", "FAIL");
      //   PROC_CHK = "ROLL";
      //   goUrl = "/rollabckAllTransactionsInProgress/";

      //   ajaxCrudOnSubmit(contForm, goUrl);
      // }

      return;
    } else if (PROC_CHK == "ROLL") {
      closeLoader();

      return;
    }
  }
}

// CSV 파일 업로드 함수
// File Input이 클릭되도록 하며 File Input에 Change가 발생하는 순간 서버와 통신 진행
const csvFileUpload = () => {
  csvFileInput.click();
};

csvFileInput.addEventListener("change", async (e) => {
  PROC_CHK = "INS";

  goUrl = "/gvrnrCRUD/";

  openLoader("파일 업로드 중... 5분 정도 소요됩니다.");

  setTimeout(() => {
    ajaxCrudOnSubmit(contForm, goUrl);
  }, 500);
});

const getTransactionsInProgress = () => {
  PROC_CHK = "ING";
  goUrl = "/getTransactionsInProgress/";
  ajaxCrudOnSubmit(contForm, goUrl, undefined, undefined);
};

// 정압기 검색 함수
const goSrch = () => {
  PROC_CHK = "SRCH";
  const goUrl = "/getGvrnrList/";

  openLoader("정압기 목록 조회 중...");

  const startDate = new Date(contFormObj.startDate.value);
  const endDate = new Date(contFormObj.endDate.value);
  const srchCntnt = contFormObj.srchCntnt;
  const dateDiff = getDateDiff(startDate, endDate, "DAY");

  chkboxCnt = 0;

  if (
    CheckIsEmpty(startDate, "시작일") == false ||
    CheckIsEmpty(endDate, "종료일") == false ||
    CheckHasSpecialChar(startDate, endDate) == false
  ) {
    closeLoader();
    return false;
  }

  if (dateDiff > 30) {
    openAlert("시작일과 종료일 간의 차이가 30일을 넘을 수 없습니다.", "FAIL");
    contFormObj.endDate.focus();
    closeLoader();
    return false;
  } else if (dateDiff < 0) {
    openAlert("기간 설정에 이상이 있습니다.", "FAIL");
    contFormObj.endDate.focus();
    closeLoader();
    return false;
  }

  setTimeout(() => {
    ajaxCrudOnSubmit(contForm, goUrl);
  }, 10);
};

// 정압기 데이터 조회 함수
const goInquire = (type) => {
  PROC_CHK = "INQ";
  const goUrl = "/getGvrnrStats/";

  if ($("#gvrnrCheckbox").length <= 0) {
    openAlert("검색된 데이터가 없습니다", "FAIL");
    $("#interval-sel").val("").prop("selected", true);
    contFormObj.intervalNum.value = "";
    return false;
  }

  if (type == "NEWLIST") {
    gvrnrUids = "";
    gvrnrNmsStr = "";

    if ($("#gvrnrCheckbox:checked").length <= 0) {
      openAlert("선택된 데이터가 없습니다", "FAIL");
      return false;
    }

    $.each($("#gvrnrCheckbox:checked"), (idx, checkbox) => {
      if (idx != 0) {
        gvrnrUids += ",";
        gvrnrNmsStr += ",";
      }

      gvrnrUids += checkbox.value;
      gvrnrNmsStr += checkbox.name;
    });

    contFormObj.gvrnrUids.value = gvrnrUids;
    contFormObj.gvrnrNms.value = gvrnrNmsStr;
  } else if (type == "REFRESH") {
  }

  openLoader();

  setTimeout(() => {
    ajaxCrudOnSubmit(contForm, goUrl);
  }, 500);
};

const accountSection = document.querySelector("#account-section");
const settingSection = document.querySelector("#setting-section");
const loginSection = document.querySelector("#login-section");
let uploadBtn = document.querySelector("#upload-btn");

const login = () => {
  loginSection.classList.add("d-none");

  [accountSection, settingSection].forEach((section) => {
    section.classList.remove("d-none");
    section.classList.add("d-flex");
  });

  uploadBtn.classList.remove("d-none");
  uploadBtn.classList.add("d-block");

  uploadBtn = document.querySelector("#upload-btn");

  uploadBtn.addEventListener("click", () => {
    openConfirm(
      "해당 날짜에 등록된 데이터가 삭제됩니다. 그래도 업로드 하시겠습니까?",
      csvFileUpload
    );
  });
};

const logout = () => {
  loginSection.classList.remove("d-none");

  [accountSection, settingSection].forEach((section) => {
    section.classList.remove("d-flex");
    section.classList.add("d-none");
  });

  uploadBtn.classList.remove("d-block");
  uploadBtn.classList.add("d-none");

  uploadBtn.parentNode.replaceChild(uploadBtn.cloneNode(true), uploadBtn);
};

const helpModal = new bootstrap.Modal(document.getElementById("modalHelp"));

const openHelp = () => {
  helpModal.show();
};

const closeHelp = () => {
  $(".manual-group").each((idx, item) => {
    $(item).hide();
  });

  helpModal.hide();
};

/**
 * 지정된 Element를 PDF로 저장한다.
 * @param {string} id PDF로 저장할 Element 아이디
 * @param {string} fileName 저장될 PDf 파일 이름
 * @returns {null} PDF 저장에 대한 반환값은 없음
 */
function savePDF(id, fileName) {
  // HTML2PDF 옵션 설정
  let option = {
    margin: 1,
    filename: fileName + ".pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "in", format: "letter", orientation: "landscape" },
  };

  html2pdf()
    .set(option)
    .from($("#" + id)[0])
    .save();
}

function resizeCol() {
  let targetWidth = "";

  if (window.innerWidth >= 2560) targetWidth = "col-8";
  else if (window.innerWidth < 2560 && window.innerWidth > 1920)
    targetWidth = "col-10";
  else if (window.innerWidth <= 1920) targetWidth = "col-11";

  if (mainWidth == targetWidth) return;
  else {
    if (mainWidth !== "") mainElem.classList.remove(mainWidth);

    mainWidth = targetWidth;

    mainElem.classList.add(targetWidth);
  }
}

function removeAllContents() {
  while (mainElem.hasChildNodes()) {
    mainElem.removeChild(mainElem.firstChild);
  }
}

//savePDF("myChart", "myChart");
